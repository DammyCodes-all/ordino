import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  ConversationMessage,
  DocumentCheckpoint,
  DocumentState,
  InternalRenderResult,
  ReferenceImage,
  ValidationReport,
  VisualReviewResult,
  WorkflowEvent,
} from "@/contracts";

export type ChatHistoryEntry = {
  id: string;
  title: string;
  updatedAt: string;
  snippet: string;
};

export type ChatSnapshot = {
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
  render: InternalRenderResult | null;
};

export type PersistedWorkspace = {
  schemaVersion: 1;
  activeChatId: string;
  chatHistory: ChatHistoryEntry[];
  snapshots: ChatSnapshot[];
  cloudDisclosureAccepted: boolean;
  savedAt: string;
};

interface OrdinoDB extends DBSchema {
  workspace: {
    key: string;
    value: PersistedWorkspace;
  };
}

const DB_NAME = "ordino";
const DB_VERSION = 1;
const WORKSPACE_KEY = "main";

let dbPromise: Promise<IDBPDatabase<OrdinoDB>> | null = null;

function getDb() {
  if (typeof window === "undefined") {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<OrdinoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workspace")) {
          db.createObjectStore("workspace");
        }
      },
    }).catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const value = await (await db).get("workspace", WORKSPACE_KEY);
    if (!value || value.schemaVersion !== 1) return null;
    return value;
  } catch {
    return null;
  }
}

export async function saveWorkspace(
  workspace: Omit<PersistedWorkspace, "schemaVersion" | "savedAt">,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const payload: PersistedWorkspace = {
      ...workspace,
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
    };
    await (await db).put("workspace", payload, WORKSPACE_KEY);
  } catch {
    // Quota / private mode — ignore; chat still works in-memory.
  }
}
