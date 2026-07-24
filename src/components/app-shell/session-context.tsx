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
  composeAgent,
  createSessionDocumentPort,
  createSessionPdfPort,
} from "@/app/integration/compose-agent";
import { downloadFileName } from "@/components/pdf-preview/fake-pdf-document";
import type {
  AgentTurnError,
  AgentTurnState,
  ConversationMessage,
  DiagnosticCheck,
  DocumentCheckpoint,
  DocumentState,
  GoogleAIHealthResponse,
  InternalRenderResult,
  OutlineItem,
  ReferenceImage,
  ValidationReport,
  VisualReviewResult,
  WorkflowEvent,
  WorkflowStage,
} from "@/contracts";
import { googleAIHealthResponseSchema } from "@/contracts";
import { createDocument } from "@/document";
import { createId } from "@/lib/document-factory";

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

type SessionContextValue = {
  document: DocumentState;
  messages: ConversationMessage[];
  referenceImages: ReferenceImage[];
  checkpoints: DocumentCheckpoint[];
  workflowEvents: WorkflowEvent[];
  turn: AgentTurnState;
  outline: OutlineItem[];
  publishedPreview: boolean;
  previewUrl: string | null;
  validation: ValidationReport | null;
  visualReview: VisualReviewResult | null;
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function reviewIterationFromMessage(message: string): 0 | 1 | 2 | 3 | null {
  const match = /revision pass (\d+)/i.exec(message);
  if (!match) return null;
  const value = Number(match[1]);
  if (value === 1 || value === 2 || value === 3) return value;
  return null;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [document, setDocument] = useState<DocumentState>(() =>
    createDocument({
      title: "Untitled document",
      documentType: "Document",
      audience: "General",
      writingStyle: "professional",
      instructions: null,
      pageLimit: null,
    }),
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [publishedRender, setPublishedRender] =
    useState<InternalRenderResult | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [visualReview, setVisualReview] = useState<VisualReviewResult | null>(
    null,
  );
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
      message:
        "Local session store available (in-memory until persistence lands).",
      remediation: null,
    },
    {
      name: "pdf_renderer",
      status: "ready",
      message: "Browser PDF renderer ready (A DocumentRenderer + toBlob).",
      remediation: null,
    },
    {
      name: "export",
      status: "ready",
      message: "PDF export ready via session PdfPort.",
      remediation: null,
    },
  ]);

  const abortRef = useRef<AbortController | null>(null);
  const documentRef = useRef(document);
  const messagesRef = useRef(messages);
  const referenceImagesRef = useRef(referenceImages);
  const previewUrlRef = useRef<string | null>(null);
  const publishedRenderRef = useRef<InternalRenderResult | null>(null);
  const pdfPort = useMemo(() => createSessionPdfPort(), []);
  const documentPort = useMemo(() => createSessionDocumentPort(), []);

  documentRef.current = document;
  messagesRef.current = messages;
  referenceImagesRef.current = referenceImages;
  publishedRenderRef.current = publishedRender;

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const publishRender = useCallback(
    (render: InternalRenderResult | null) => {
      revokePreviewUrl();
      if (!render) {
        setPublishedRender(null);
        setPublishedPreview(false);
        return;
      }
      const url = URL.createObjectURL(render.pdfBlob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPublishedRender(render);
      setPublishedPreview(true);
      setPreviewOpen(true);
    },
    [revokePreviewUrl],
  );

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

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

  const generationBlocked = health?.status !== "ready";

  const outline = useMemo(
    () => documentPort.outline(document) as OutlineItem[],
    [document, documentPort],
  );
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

      const priorConversation = messagesRef.current;
      const snapshotDocument = documentRef.current;
      const refs = referenceImagesRef.current;
      const refIds = refs.map((image) => image.id);

      const userMessage: ConversationMessage = {
        id: createId("message"),
        role: "user",
        text: trimmed,
        referenceImageIds: refIds,
        createdAt: new Date().toISOString(),
      };

      const turnDocument: DocumentState =
        snapshotDocument.nodes.length === 0
          ? {
              ...snapshotDocument,
              meta: {
                ...snapshotDocument.meta,
                title:
                  trimmed.slice(0, 80).replace(/\s+/g, " ") ||
                  "Untitled document",
              },
            }
          : snapshotDocument;

      setMessages((prev) => [...prev, userMessage]);
      setWorkflowEvents([]);
      setValidation(null);
      setVisualReview(null);
      setTurn({ running: true, stage: "planning", reviewIteration: 0 });

      const controller = new AbortController();
      abortRef.current = controller;

      const agent = composeAgent({
        onEvent: (event) => {
          setWorkflowEvents((prev) => [...prev, event]);
          const iteration = reviewIterationFromMessage(event.message);
          setTurn((prev) => ({
            ...prev,
            stage: event.stage,
            reviewIteration: iteration ?? prev.reviewIteration,
            running:
              event.stage !== "ready" &&
              event.stage !== "failed" &&
              event.stage !== "cancelled" &&
              event.stage !== "idle",
          }));
        },
      });

      try {
        const result = await agent.runTurn({
          userMessage: trimmed,
          document: turnDocument,
          conversation: priorConversation,
          referenceImages: refs,
          signal: controller.signal,
        });

        if (result.success) {
          setDocument(result.data.document);
          setCheckpoints((prev) => [
            ...prev,
            ...result.data.createdCheckpoints,
          ]);
          setValidation(result.data.validation);
          setVisualReview(result.data.visualReview);
          publishRender(result.data.finalRender);

          const assistantMessage: ConversationMessage = {
            id: createId("message"),
            role: "assistant",
            text: result.data.assistantMessage,
            referenceImageIds: [],
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setTurn({
            running: false,
            stage: "ready",
            reviewIteration: result.data.reviewIterations,
          });
          return;
        }

        const error = result.error as AgentTurnError;
        const recovery = error.recovery;
        setDocument(recovery.document);
        setCheckpoints((prev) => [...prev, ...recovery.createdCheckpoints]);
        if (recovery.lastValidRender) {
          publishRender(recovery.lastValidRender);
        }

        if (error.code === "ABORTED") {
          setWorkflowEvents((prev) => [
            ...prev,
            {
              stage: "cancelled",
              message: STAGE_LABELS.cancelled,
              level: "warning",
              createdAt: new Date().toISOString(),
            },
          ]);
          setTurn({ running: false, stage: "cancelled", reviewIteration: 0 });
        } else {
          setWorkflowEvents((prev) => [
            ...prev,
            {
              stage: "failed",
              message: error.message.slice(0, 300) || STAGE_LABELS.failed,
              level: "error",
              createdAt: new Date().toISOString(),
            },
          ]);
          setTurn({ running: false, stage: "failed", reviewIteration: 0 });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unexpected turn failure.";
        setWorkflowEvents((prev) => [
          ...prev,
          {
            stage: "failed",
            message: message.slice(0, 300),
            level: "error",
            createdAt: new Date().toISOString(),
          },
        ]);
        setTurn({ running: false, stage: "failed", reviewIteration: 0 });
      } finally {
        abortRef.current = null;
      }
    },
    [cloudDisclosureAccepted, generationBlocked, publishRender, turn.running],
  );

  const undo = useCallback(() => {
    if (actionsDisabled || checkpoints.length === 0) return;
    const previous = checkpoints[checkpoints.length - 1];
    setDocument(previous.document);
    setCheckpoints((prev) => prev.slice(0, -1));
    setValidation(null);
    setVisualReview(null);
    setTurn({ running: false, stage: "idle", reviewIteration: 0 });

    if (previous.document.nodes.length === 0) {
      publishRender(null);
      return;
    }

    void pdfPort.render(previous.document).then((result) => {
      if (result.success) {
        publishRender(result.data);
      } else {
        publishRender(null);
      }
    });
  }, [actionsDisabled, checkpoints, pdfPort, publishRender]);

  const exportPdf = useCallback(() => {
    if (!publishedPreview) return;
    const current = documentRef.current;
    const existing = publishedRenderRef.current;
    void pdfPort.export(current, existing ?? undefined).then((result) => {
      if (!result.success) return;
      const url = URL.createObjectURL(result.data.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download =
        result.data.filename ||
        downloadFileName(current.meta.title, current.version);
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }, [pdfPort, publishedPreview]);

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
    setDocument(
      createDocument({
        title: "Untitled document",
        documentType: "Document",
        audience: "General",
        writingStyle: "professional",
        instructions: null,
        pageLimit: null,
      }),
    );
    setMessages([]);
    setReferenceImages([]);
    setCheckpoints([]);
    setWorkflowEvents([]);
    setValidation(null);
    setVisualReview(null);
    publishRender(null);
    setPreviewOpen(false);
    setTurn({ running: false, stage: "idle", reviewIteration: 0 });
  }, [actionsDisabled, publishRender]);

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
      previewUrl,
      validation,
      visualReview,
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
      previewUrl,
      validation,
      visualReview,
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
