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
  DiagnosticName,
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
import { DEFAULT_GOOGLE_AI_CONFIGURATION } from "@/contracts";
import { createMemoryStorageCheck, runStartupDiagnostics } from "@/diagnostics";
import { createDocument } from "@/document";
import {
  createErrorResult,
  createModelDiagnosticPort,
  createSuccessResult,
} from "@/google-ai";
import { createId } from "@/lib/document-factory";

const INITIAL_DIAGNOSTIC_NAMES: DiagnosticName[] = [
  "api_key",
  "authentication",
  "google_ai_service",
  "model",
  "vision",
  "internet",
  "rate_limit",
  "storage",
  "pdf_renderer",
  "export",
];

const INITIAL_DIAGNOSTICS: DiagnosticCheck[] = INITIAL_DIAGNOSTIC_NAMES.map(
  (name) => ({
    name,
    status: "checking",
    message: `Checking ${name.replaceAll("_", " ")}…`,
    remediation: null,
  }),
);

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

export type ChatHistoryEntry = {
  id: string;
  title: string;
  updatedAt: string;
  snippet: string;
};

type ChatSnapshot = {
  id: string;
  title: string;
  updatedAt: string;
  document: DocumentState;
  messages: ConversationMessage[];
  referenceImages: ReferenceImage[];
  checkpoints: DocumentCheckpoint[];
  workflowEvents: WorkflowEvent[];
  validation: ValidationReport | null;
  visualReview: VisualReviewResult | null;
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
  publishedRender: InternalRenderResult | null;
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
  chatHistory: ChatHistoryEntry[];
  activeChatId: string;
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
  selectChat: (id: string) => void;
  refreshHealth: () => Promise<void>;
};

function createBlankDocument() {
  return createDocument({
    title: "Untitled document",
    documentType: "Document",
    audience: "General",
    writingStyle: "professional",
    instructions: null,
    pageLimit: null,
  });
}

function chatTitleFrom(
  document: DocumentState,
  messages: ConversationMessage[],
) {
  const firstUser = messages.find((message) => message.role === "user");
  if (firstUser) {
    const text = firstUser.text.trim();
    return text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }
  if (document.meta.title && document.meta.title !== "Untitled document") {
    return document.meta.title;
  }
  return "Untitled chat";
}

function chatSnippetFrom(messages: ConversationMessage[]) {
  const last = messages.at(-1);
  if (!last) return "";
  const text = last.text.trim();
  return text.length > 56 ? `${text.slice(0, 56)}…` : text;
}

function entryFromSnapshot(snapshot: ChatSnapshot): ChatHistoryEntry {
  return {
    id: snapshot.id,
    title: snapshot.title,
    updatedAt: snapshot.updatedAt,
    snippet: chatSnippetFrom(snapshot.messages),
  };
}

function upsertHistory(
  prev: ChatHistoryEntry[],
  entry: ChatHistoryEntry,
): ChatHistoryEntry[] {
  const without = prev.filter((item) => item.id !== entry.id);
  return [entry, ...without].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

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
  const initialRef = useRef<{
    document: DocumentState;
    chatHistory: ChatHistoryEntry[];
  } | null>(null);
  if (!initialRef.current) {
    const blank = createBlankDocument();
    initialRef.current = {
      document: blank,
      chatHistory: [
        {
          id: blank.documentId,
          title: "Untitled chat",
          updatedAt: new Date().toISOString(),
          snippet: "",
        },
      ],
    };
  }

  const [document, setDocument] = useState(initialRef.current.document);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [checkpoints, setCheckpoints] = useState<DocumentCheckpoint[]>([]);
  const [workflowEvents, setWorkflowEvents] = useState<WorkflowEvent[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>(
    initialRef.current.chatHistory,
  );
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
  const [diagnosticChecks, setDiagnosticChecks] =
    useState<DiagnosticCheck[]>(INITIAL_DIAGNOSTICS);
  const [diagnosticsReady, setDiagnosticsReady] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const documentRef = useRef(document);
  const messagesRef = useRef(messages);
  const referenceImagesRef = useRef(referenceImages);
  const checkpointsRef = useRef(checkpoints);
  const workflowEventsRef = useRef(workflowEvents);
  const validationRef = useRef(validation);
  const visualReviewRef = useRef(visualReview);
  const previewUrlRef = useRef<string | null>(null);
  const publishedRenderRef = useRef<InternalRenderResult | null>(null);
  const snapshotsRef = useRef(new Map<string, ChatSnapshot>());
  const pdfPort = useMemo(() => createSessionPdfPort(), []);
  const documentPort = useMemo(() => createSessionDocumentPort(), []);

  documentRef.current = document;
  messagesRef.current = messages;
  referenceImagesRef.current = referenceImages;
  checkpointsRef.current = checkpoints;
  workflowEventsRef.current = workflowEvents;
  validationRef.current = validation;
  visualReviewRef.current = visualReview;
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
    setDiagnosticChecks(
      INITIAL_DIAGNOSTIC_NAMES.map((name) => ({
        name,
        status: "checking" as const,
        message: `Checking ${name.replaceAll("_", " ")}…`,
        remediation: null,
      })),
    );
    setDiagnosticsReady(false);

    const model = createModelDiagnosticPort(DEFAULT_GOOGLE_AI_CONFIGURATION);
    const probeDocument = createDocument({
      title: "Diagnostics probe",
      documentType: "Document",
      audience: "Internal",
      writingStyle: "professional",
      instructions: null,
      pageLimit: null,
    });

    try {
      const result = await runStartupDiagnostics({
        model,
        checkStorage: createMemoryStorageCheck(),
        checkPdfRenderer: async (signal) => {
          const rendered = await pdfPort.render(probeDocument, signal);
          if (!rendered.success) {
            return createErrorResult(
              rendered.error.code,
              rendered.error.message,
              rendered.error.retryable,
            );
          }
          return createSuccessResult(undefined);
        },
        checkExport: async (signal) => {
          const exported = await pdfPort.export(
            probeDocument,
            undefined,
            signal,
          );
          if (!exported.success) {
            return createErrorResult(
              exported.error.code,
              exported.error.message,
              exported.error.retryable,
            );
          }
          return createSuccessResult(undefined);
        },
      });

      setDiagnosticChecks(result.checks);
      setDiagnosticsReady(result.ready);

      const apiKey = result.checks.find((check) => check.name === "api_key");
      const service = result.checks.find(
        (check) => check.name === "google_ai_service",
      );
      const modelCheck = result.checks.find((check) => check.name === "model");
      setHealth({
        provider: "google-ai-studio",
        modelId: DEFAULT_GOOGLE_AI_CONFIGURATION.modelId,
        status: result.ready
          ? "ready"
          : apiKey?.status === "failed"
            ? "not_configured"
            : "unavailable",
        message:
          service?.message ||
          modelCheck?.message ||
          apiKey?.message ||
          (result.ready
            ? "All startup diagnostics passed."
            : "Startup diagnostics reported failures."),
      });
    } catch (error) {
      setDiagnosticsReady(false);
      setHealth(null);
      setDiagnosticChecks(
        INITIAL_DIAGNOSTIC_NAMES.map((name) => ({
          name,
          status: "failed" as const,
          message:
            error instanceof Error
              ? error.message
              : "Could not complete startup diagnostics.",
          remediation: "Confirm the Next.js server is running and online.",
        })),
      );
    }
  }, [pdfPort]);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const generationBlocked = !diagnosticsReady;

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

  const archiveCurrent = useCallback(() => {
    const current = documentRef.current;
    const currentMessages = messagesRef.current;
    const snapshot: ChatSnapshot = {
      id: current.documentId,
      title: chatTitleFrom(current, currentMessages),
      updatedAt: new Date().toISOString(),
      document: current,
      messages: currentMessages,
      referenceImages: referenceImagesRef.current,
      checkpoints: checkpointsRef.current,
      workflowEvents: workflowEventsRef.current,
      validation: validationRef.current,
      visualReview: visualReviewRef.current,
    };
    snapshotsRef.current.set(snapshot.id, snapshot);
    setChatHistory((prev) => upsertHistory(prev, entryFromSnapshot(snapshot)));
    return snapshot;
  }, []);

  const resetLiveSession = useCallback(
    (nextDocument: DocumentState) => {
      abortRef.current?.abort();
      setDocument(nextDocument);
      setMessages([]);
      setReferenceImages([]);
      setCheckpoints([]);
      setWorkflowEvents([]);
      setValidation(null);
      setVisualReview(null);
      publishRender(null);
      setPreviewOpen(false);
      setTurn({ running: false, stage: "idle", reviewIteration: 0 });
    },
    [publishRender],
  );

  const newDocument = useCallback(() => {
    if (actionsDisabled) return;
    const hasContent = messagesRef.current.length > 0;
    if (hasContent) {
      const confirmed = window.confirm(
        "Start a new chat? Your current chat will be saved in history.",
      );
      if (!confirmed) return;
      archiveCurrent();
    }

    const next = createBlankDocument();
    resetLiveSession(next);
    setChatHistory((prev) =>
      upsertHistory(prev, {
        id: next.documentId,
        title: "Untitled chat",
        updatedAt: new Date().toISOString(),
        snippet: "",
      }),
    );
  }, [actionsDisabled, archiveCurrent, resetLiveSession]);

  const selectChat = useCallback(
    (id: string) => {
      if (actionsDisabled) return;
      if (id === documentRef.current.documentId) return;

      const snapshot = snapshotsRef.current.get(id);
      if (!snapshot) return;

      archiveCurrent();
      abortRef.current?.abort();
      setDocument(snapshot.document);
      setMessages(snapshot.messages);
      setReferenceImages(snapshot.referenceImages);
      setCheckpoints(snapshot.checkpoints);
      setWorkflowEvents(snapshot.workflowEvents);
      setValidation(snapshot.validation);
      setVisualReview(snapshot.visualReview);
      publishRender(null);
      setPreviewOpen(false);
      setTurn({ running: false, stage: "idle", reviewIteration: 0 });
      setChatHistory((prev) =>
        upsertHistory(prev, {
          ...entryFromSnapshot(snapshot),
          updatedAt: new Date().toISOString(),
        }),
      );
    },
    [actionsDisabled, archiveCurrent, publishRender],
  );

  useEffect(() => {
    setChatHistory((prev) =>
      upsertHistory(prev, {
        id: document.documentId,
        title: chatTitleFrom(document, messages),
        updatedAt: new Date().toISOString(),
        snippet: chatSnippetFrom(messages),
      }),
    );
  }, [document, messages]);

  const activeChatId = document.documentId;

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
      publishedRender,
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
      chatHistory,
      activeChatId,
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
      selectChat,
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
      publishedRender,
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
      chatHistory,
      activeChatId,
      acceptDisclosure,
      sendPrompt,
      cancelTurn,
      undo,
      exportPdf,
      addReference,
      removeReference,
      newDocument,
      selectChat,
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
