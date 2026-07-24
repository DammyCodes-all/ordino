"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  downloadFileName,
  renderFakePdfBlob,
} from "@/components/pdf-preview/fake-pdf-document";
import type {
  AgentTurnState,
  ConversationMessage,
  DiagnosticCheck,
  DocumentCheckpoint,
  DocumentState,
  GoogleAIHealthResponse,
  OutlineItem,
  ReferenceImage,
  WorkflowEvent,
  WorkflowStage,
} from "@/contracts";
import { googleAIHealthResponseSchema } from "@/contracts";
import {
  createCheckpoint,
  createEmptyDocument,
  createId,
  createMockDocumentFromPrompt,
  deriveOutline,
} from "@/lib/document-factory";

const STAGE_LABELS: Record<WorkflowStage, string> = {
  idle: "Ready",
  planning: "Planning document",
  generating: "Writing sections",
  rendering: "Rendering PDF",
  validating: "Checking layout",
  rasterizing: "Preparing pages",
  reviewing: "Reviewing visually",
  revising: "Revising document",
  finalizing: "Finalizing",
  ready: "Export ready",
  failed: "Failed",
  cancelled: "Cancelled",
};

const MOCK_TURN_STAGES: WorkflowStage[] = [
  "planning",
  "generating",
  "rendering",
  "validating",
  "reviewing",
  "finalizing",
  "ready",
];

type SessionContextValue = {
  document: DocumentState;
  messages: ConversationMessage[];
  referenceImages: ReferenceImage[];
  checkpoints: DocumentCheckpoint[];
  workflowEvents: WorkflowEvent[];
  turn: AgentTurnState;
  outline: OutlineItem[];
  publishedPreview: boolean;
  cloudDisclosureAccepted: boolean;
  disclosureOpen: boolean;
  diagnosticsOpen: boolean;
  previewOpen: boolean;
  health: GoogleAIHealthResponse | null;
  diagnosticChecks: DiagnosticCheck[];
  generationBlocked: boolean;
  stageLabel: string;
  actionsDisabled: boolean;
  setPreviewOpen: (open: boolean) => void;
  setDisclosureOpen: (open: boolean) => void;
  setDiagnosticsOpen: (open: boolean) => void;
  acceptDisclosure: () => void;
  sendPrompt: (text: string) => Promise<void>;
  cancelTurn: () => void;
  undo: () => void;
  exportPdf: () => void;
  addReference: (file: File) => Promise<void>;
  removeReference: (id: ReferenceImage["id"]) => void;
  newDocument: () => void;
  refreshHealth: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => resolve(), ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<DocumentState>(() =>
    createEmptyDocument(),
  );
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [checkpoints, setCheckpoints] = useState<DocumentCheckpoint[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [turn, setTurn] = useState<AgentTurnState>({
    running: false,
    stage: "idle",
    reviewIteration: 0,
  });
  const [publishedPreview, setPublishedPreview] = useState(false);
  const [cloudDisclosureAccepted, setCloudDisclosureAccepted] = useState(false);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [health, setHealth] = useState<GoogleAIHealthResponse | null>(null);
  const [diagnosticChecks, setDiagnosticChecks] = useState<DiagnosticCheck[]>([
    {
      name: "google_ai_service",
      status: "checking",
      message: "Checking Google AI Studio…",
      remediation: null,
    },
    {
      name: "api_key",
      status: "checking",
      message: "Checking API key configuration…",
      remediation: null,
    },
    {
      name: "storage",
      status: "ready",
      message: "Local session store available (mock).",
      remediation: null,
    },
    {
      name: "pdf_renderer",
      status: "ready",
      message: "Fake PDF renderer active for UI preview.",
      remediation: null,
    },
    {
      name: "export",
      status: "ready",
      message: "Fake PDF export available.",
      remediation: null,
    },
  ]);

  const abortRef = useRef<AbortController | null>(null);
  const documentRef = useRef(document);
  documentRef.current = document;

  const pushEvent = useCallback(
    (stage: WorkflowStage, level: WorkflowEvent["level"] = "info") => {
      const event: WorkflowEvent = {
        stage,
        message: STAGE_LABELS[stage],
        level,
        createdAt: new Date().toISOString(),
      };
      setWorkflowEvents((prev) => [...prev, event]);
      setTurn((prev) => ({
        ...prev,
        stage,
        running:
          stage !== "ready" &&
          stage !== "failed" &&
          stage !== "cancelled" &&
          stage !== "idle",
      }));
    },
    [],
  );

  const refreshHealth = useCallback(async () => {
    setDiagnosticChecks((prev) =>
      prev.map((check) =>
        check.name === "google_ai_service" || check.name === "api_key"
          ? {
              ...check,
              status: "checking",
              message:
                check.name === "api_key"
                  ? "Checking API key configuration…"
                  : "Checking Google AI Studio…",
              remediation: null,
            }
          : check,
      ),
    );

    try {
      const response = await fetch("/api/ai/health", { cache: "no-store" });
      const json: unknown = await response.json();
      const parsed = googleAIHealthResponseSchema.safeParse(json);
      if (!parsed.success) {
        setHealth(null);
        setDiagnosticChecks((prev) =>
          prev.map((check) =>
            check.name === "google_ai_service" || check.name === "api_key"
              ? {
                  ...check,
                  status: "failed",
                  message: "Unexpected health response.",
                  remediation:
                    "Retry the health check or restart the dev server.",
                }
              : check,
          ),
        );
        return;
      }

      setHealth(parsed.data);
      const ready = parsed.data.status === "ready";
      const notConfigured = parsed.data.status === "not_configured";
      setDiagnosticChecks((prev) =>
        prev.map((check) => {
          if (check.name === "api_key") {
            return {
              ...check,
              status: notConfigured ? "failed" : ready ? "ready" : "failed",
              message: parsed.data.message,
              remediation: notConfigured
                ? "Set GOOGLE_GENERATIVE_AI_API_KEY in the server environment (never NEXT_PUBLIC_)."
                : ready
                  ? null
                  : "Verify the server key and model configuration.",
            };
          }
          if (check.name === "google_ai_service") {
            return {
              ...check,
              status: ready ? "ready" : "failed",
              message: parsed.data.message,
              remediation: ready
                ? null
                : "Confirm internet access and Google AI Studio availability.",
            };
          }
          return check;
        }),
      );
    } catch {
      setHealth(null);
      setDiagnosticChecks((prev) =>
        prev.map((check) =>
          check.name === "google_ai_service" || check.name === "api_key"
            ? {
                ...check,
                status: "failed",
                message: "Could not reach the health route.",
                remediation:
                  "Confirm the Next.js server is running and online.",
              }
            : check,
        ),
      );
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const generationBlocked = false;

  const outline = useMemo(() => deriveOutline(document), [document]);
  const actionsDisabled = turn.running;
  const stageLabel = STAGE_LABELS[turn.stage];

  const acceptDisclosure = useCallback(() => {
    setCloudDisclosureAccepted(true);
    setDisclosureOpen(false);
  }, []);

  const cancelTurn = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || turn.running || generationBlocked) return;

      if (!cloudDisclosureAccepted) {
        setDisclosureOpen(true);
        return;
      }

      const refIds = referenceImages.map((image) => image.id);
      const userMessage: ConversationMessage = {
        id: createId("message"),
        role: "user",
        text: trimmed,
        referenceImageIds: refIds,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setCheckpoints((prev) => [
        ...prev,
        createCheckpoint(documentRef.current, "user_turn"),
      ]);
      setWorkflowEvents([]);
      setTurn({ running: true, stage: "planning", reviewIteration: 0 });
      // Keep an existing artifact open during revisions (Claude-style).

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        for (const stage of MOCK_TURN_STAGES) {
          pushEvent(stage, stage === "ready" ? "success" : "info");
          if (stage === "ready") break;
          await sleep(520, controller.signal);
        }

        const nextDocument = createMockDocumentFromPrompt(trimmed);
        setDocument(nextDocument);
        setPublishedPreview(true);
        setPreviewOpen(true);

        const assistantMessage: ConversationMessage = {
          id: createId("message"),
          role: "assistant",
          text: `I've drafted “${nextDocument.meta.title}” with ${nextDocument.nodes.length} sections. Review the outline and PDF preview on the right — say what to change next.`,
          referenceImageIds: [],
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setTurn({ running: false, stage: "ready", reviewIteration: 0 });
      } catch (error) {
        const aborted =
          error instanceof DOMException && error.name === "AbortError";
        if (aborted) {
          pushEvent("cancelled", "warning");
          setTurn({ running: false, stage: "cancelled", reviewIteration: 0 });
        } else {
          pushEvent("failed", "error");
          setTurn({ running: false, stage: "failed", reviewIteration: 0 });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [
      cloudDisclosureAccepted,
      generationBlocked,
      pushEvent,
      referenceImages,
      turn.running,
    ],
  );

  const undo = useCallback(() => {
    if (actionsDisabled || checkpoints.length === 0) return;
    const previous = checkpoints[checkpoints.length - 1];
    setDocument(previous.document);
    setCheckpoints((prev) => prev.slice(0, -1));
    setPublishedPreview(previous.document.nodes.length > 0);
    setTurn({ running: false, stage: "idle", reviewIteration: 0 });
  }, [actionsDisabled, checkpoints]);

  const exportPdf = useCallback(() => {
    if (!publishedPreview) return;
    void renderFakePdfBlob(document).then((blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFileName(document.meta.title);
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }, [document, publishedPreview]);

  const addReference = useCallback(
    async (file: File) => {
      if (actionsDisabled) return;
      const allowed = ["image/png", "image/jpeg", "image/webp"] as const;
      if (!allowed.includes(file.type as (typeof allowed)[number])) {
        window.alert("Reference images must be PNG, JPEG, or WebP.");
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const image: ReferenceImage = {
        id: createId("reference"),
        name: file.name.slice(0, 255) || "reference",
        mimeType: file.type as ReferenceImage["mimeType"],
        dataUrl,
        purpose: null,
        addedAt: new Date().toISOString(),
      };
      setReferenceImages((prev) => [...prev, image]);
    },
    [actionsDisabled],
  );

  const removeReference = useCallback(
    (id: ReferenceImage["id"]) => {
      if (actionsDisabled) return;
      setReferenceImages((prev) => prev.filter((image) => image.id !== id));
    },
    [actionsDisabled],
  );

  const newDocument = useCallback(() => {
    if (actionsDisabled) return;
    const confirmed = window.confirm(
      "Start a new document? The current session will be cleared.",
    );
    if (!confirmed) return;
    abortRef.current?.abort();
    setDocument(createEmptyDocument());
    setMessages([]);
    setReferenceImages([]);
    setCheckpoints([]);
    setWorkflowEvents([]);
    setPublishedPreview(false);
    setPreviewOpen(false);
    setTurn({ running: false, stage: "idle", reviewIteration: 0 });
  }, [actionsDisabled]);

  const value = useMemo<SessionContextValue>(
    () => ({
      document,
      messages,
      referenceImages,
      checkpoints,
      workflowEvents,
      turn,
      outline,
      publishedPreview,
      cloudDisclosureAccepted,
      disclosureOpen,
      diagnosticsOpen,
      previewOpen,
      health,
      diagnosticChecks,
      generationBlocked,
      stageLabel,
      actionsDisabled,
      setPreviewOpen,
      setDisclosureOpen,
      setDiagnosticsOpen,
      acceptDisclosure,
      sendPrompt,
      cancelTurn,
      undo,
      exportPdf,
      addReference,
      removeReference,
      newDocument,
      refreshHealth,
    }),
    [
      document,
      messages,
      referenceImages,
      checkpoints,
      workflowEvents,
      turn,
      outline,
      publishedPreview,
      cloudDisclosureAccepted,
      disclosureOpen,
      diagnosticsOpen,
      previewOpen,
      health,
      diagnosticChecks,
      generationBlocked,
      stageLabel,
      actionsDisabled,
      acceptDisclosure,
      sendPrompt,
      cancelTurn,
      undo,
      exportPdf,
      addReference,
      removeReference,
      newDocument,
      refreshHealth,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}

export { STAGE_LABELS };
