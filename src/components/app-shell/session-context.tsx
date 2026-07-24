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
  ToolCallEvent,
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
import {
  appendNarration,
  narrateTurnFailure,
  narrateTurnStart,
  narrateTurnSuccess,
  narrateWorkflowEvent,
} from "@/lib/agent-narration";
import {
  type ChatHistoryEntry as PersistedHistoryEntry,
  type ChatSnapshot as PersistedSnapshot,
  loadWorkspace,
  saveWorkspace,
} from "@/lib/chat-persistence";

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

export type ChatHistoryEntry = PersistedHistoryEntry;

type ChatSnapshot = PersistedSnapshot;

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
  agentNarration: string;
  liveToolCalls: ToolCallEvent[];
  lastError: { message: string; retryable: boolean } | null;
  setPreviewOpen: (open: boolean) => void;
  setDisclosureOpen: (open: boolean) => void;
  setDiagnosticsOpen: (open: boolean) => void;
  acceptDisclosure: () => void;
  sendPrompt: (text: string) => Promise<void>;
  cancelTurn: () => void;
  retry: () => void;
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

function reviewIterationFromMessage(message: string): 0 | 1 | null {
  const match = /revision pass (\d+)/i.exec(message);
  if (!match) return null;
  const value = Number(match[1]);
  if (value === 1) return value;
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
  const [cloudDisclosureAccepted, setCloudDisclosureAccepted] = useState(true);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [health, setHealth] = useState<GoogleAIHealthResponse | null>(null);
  const [diagnosticChecks, setDiagnosticChecks] =
    useState<DiagnosticCheck[]>(INITIAL_DIAGNOSTICS);
  const [diagnosticsReady, setDiagnosticsReady] = useState(false);
  const [agentNarration, setAgentNarration] = useState("");
  const [liveToolCalls, setLiveToolCalls] = useState<
    import("@/contracts").ToolCallEvent[]
  >([]);
  const [lastError, setLastError] = useState<{
    message: string;
    retryable: boolean;
  } | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const documentRef = useRef(document);
  const messagesRef = useRef(messages);
  const turnRef = useRef(turn);
  const referenceImagesRef = useRef(referenceImages);
  const checkpointsRef = useRef(checkpoints);
  const workflowEventsRef = useRef(workflowEvents);
  const validationRef = useRef(validation);
  const visualReviewRef = useRef(visualReview);
  const previewUrlRef = useRef<string | null>(null);
  const publishedRenderRef = useRef<InternalRenderResult | null>(null);
  const snapshotsRef = useRef(new Map<string, ChatSnapshot>());
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfPort = useMemo(() => createSessionPdfPort(), []);
  const documentPort = useMemo(() => createSessionDocumentPort(), []);

  documentRef.current = document;
  messagesRef.current = messages;
  turnRef.current = turn;
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
      setAgentNarration("");
      setLiveToolCalls([]);
      setLastError(null);

      const liveAssistantId = createId("message");
      const liveAssistant: ConversationMessage = {
        id: liveAssistantId,
        role: "assistant",
        text: narrateTurnStart(trimmed),
        referenceImageIds: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, liveAssistant]);

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
          const line = narrateWorkflowEvent(event);
          if (line) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === liveAssistantId
                  ? {
                      ...message,
                      text: appendNarration(message.text, line),
                    }
                  : message,
              ),
            );
          }
        },
        onThinking: (text) => {
          setAgentNarration((prev) => prev + "\n" + text);
        },
        onToolCall: (event) => {
          setLiveToolCalls((prev) => [...prev, event]);
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

          setMessages((prev) =>
            prev.map((message) =>
              message.id === liveAssistantId
                ? {
                    ...message,
                    text: narrateTurnSuccess({
                      liveText: message.text,
                      title: result.data.document.meta.title,
                      reviewIterations: result.data.reviewIterations,
                    }),
                  }
                : message,
            ),
          );
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
          setMessages((prev) =>
            prev.map((message) =>
              message.id === liveAssistantId
                ? {
                    ...message,
                    text: narrateTurnFailure(
                      message.text,
                      STAGE_LABELS.cancelled,
                    ),
                  }
                : message,
            ),
          );
          setTurn({ running: false, stage: "cancelled", reviewIteration: 0 });
        } else {
          const isRetryable =
            (error as any).retryable === true ||
            error.code === "MODEL_RATE_LIMITED" ||
            error.code === "MODEL_SERVICE_UNAVAILABLE" ||
            error.code === "MODEL_REQUEST_FAILED";
          setLastError({
            message: error.message.slice(0, 300) || STAGE_LABELS.failed,
            retryable: isRetryable,
          });
          setWorkflowEvents((prev) => [
            ...prev,
            {
              stage: "failed",
              message: error.message.slice(0, 300) || STAGE_LABELS.failed,
              level: "error",
              createdAt: new Date().toISOString(),
            },
          ]);
          setMessages((prev) =>
            prev.map((message) =>
              message.id === liveAssistantId
                ? {
                    ...message,
                    text: narrateTurnFailure(
                      message.text,
                      error.message.slice(0, 300) || STAGE_LABELS.failed,
                    ),
                  }
                : message,
            ),
          );
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
        setMessages((prev) =>
          prev.map((item) =>
            item.id === liveAssistantId
              ? {
                  ...item,
                  text: narrateTurnFailure(item.text, message.slice(0, 300)),
                }
              : item,
          ),
        );
        setTurn({ running: false, stage: "failed", reviewIteration: 0 });
      } finally {
        abortRef.current = null;
      }
    },
    [generationBlocked, publishRender, turn.running],
  );

  const retry = useCallback(() => {
    if (turn.running || !lastError?.retryable) return;
    const lastUserMsg = messagesRef.current.findLast(
      (m) => m.role === "user",
    );
    if (lastUserMsg) {
      void sendPrompt(lastUserMsg.text);
    }
  }, [turn.running, lastError, sendPrompt]);

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
      setAgentNarration("");
      setLiveToolCalls([]);
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

      if (messagesRef.current.length > 0) {
        archiveCurrent();
      }
      abortRef.current?.abort();
      setDocument(snapshot.document);
      setMessages(snapshot.messages);
      setReferenceImages(snapshot.referenceImages);
      setCheckpoints(snapshot.checkpoints);
      setWorkflowEvents(snapshot.workflowEvents);
      setValidation(snapshot.validation);
      setVisualReview(snapshot.visualReview);
      setAgentNarration("");
      setLiveToolCalls([]);
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
    let cancelled = false;
    void (async () => {
      const stored = await loadWorkspace();
      if (cancelled || !stored) {
        hydratedRef.current = true;
        return;
      }

      for (const snapshot of stored.snapshots) {
        snapshotsRef.current.set(snapshot.id, snapshot);
      }
      setChatHistory(stored.chatHistory);
      setCloudDisclosureAccepted(stored.cloudDisclosureAccepted);

      const active =
        stored.snapshots.find((item) => item.id === stored.activeChatId) ??
        stored.snapshots[0];
      if (active) {
        setDocument(active.document);
        setMessages(active.messages);
        setReferenceImages(active.referenceImages);
        setCheckpoints(active.checkpoints);
        setWorkflowEvents(active.workflowEvents);
        setValidation(active.validation);
        setVisualReview(active.visualReview);
        publishRender(null);
        setPreviewOpen(false);
        setTurn({ running: false, stage: "idle", reviewIteration: 0 });
      }
      hydratedRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [publishRender]);

  useEffect(() => {
    if (turnRef.current.running) return;
    setChatHistory((prev) =>
      upsertHistory(prev, {
        id: document.documentId,
        title: chatTitleFrom(document, messages),
        updatedAt: new Date().toISOString(),
        snippet: chatSnippetFrom(messages),
      }),
    );
  }, [document, messages]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    const current: ChatSnapshot = {
      id: document.documentId,
      title: chatTitleFrom(document, messages),
      updatedAt: new Date().toISOString(),
      document,
      messages,
      referenceImages,
      checkpoints,
      workflowEvents,
      validation,
      visualReview,
    };
    snapshotsRef.current.set(current.id, current);

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveWorkspace({
        activeChatId: document.documentId,
        chatHistory,
        snapshots: Array.from(snapshotsRef.current.values()),
        cloudDisclosureAccepted,
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    document,
    messages,
    referenceImages,
    checkpoints,
    workflowEvents,
    validation,
    visualReview,
    chatHistory,
    cloudDisclosureAccepted,
  ]);

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
      agentNarration,
      liveToolCalls,
      lastError,
      setPreviewOpen,
      setDisclosureOpen,
      setDiagnosticsOpen,
      acceptDisclosure,
      sendPrompt,
      cancelTurn,
      retry,
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
      agentNarration,
      liveToolCalls,
      lastError,
      acceptDisclosure,
      sendPrompt,
      cancelTurn,
      retry,
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
