"use client";

import { Add01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { motion } from "motion/react";
import { useSession } from "@/components/app-shell/session-context";
import { AppIcon } from "@/components/ui/app-icon";

const PANEL_WIDTH = 248;

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ChatHistorySidebar({ open }: { open: boolean }) {
  const {
    chatHistory,
    activeChatId,
    actionsDisabled,
    newDocument,
    selectChat,
  } = useSession();

  return (
    <motion.aside
      initial={false}
      animate={{
        width: open ? PANEL_WIDTH : 0,
        opacity: open ? 1 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 32,
        mass: 0.85,
      }}
      className="relative ml-3 flex h-full shrink-0 overflow-hidden"
      aria-hidden={!open}
    >
      <div
        className="flex h-full w-[248px] flex-col rounded-[2rem] bg-surface/70 py-5 shadow-[0_12px_40px_rgba(61,41,24,0.08)] backdrop-blur-[6px]"
        style={{ pointerEvents: open ? "auto" : "none" }}
      >
        <div className="px-4 pb-4">
          <p className="mb-3 px-2 text-[11px] font-medium tracking-[0.14em] text-muted-dim uppercase">
            Chats
          </p>
          <button
            type="button"
            onClick={newDocument}
            disabled={actionsDisabled}
            className="flex w-full items-center gap-2.5 rounded-2xl bg-accent px-3.5 py-3 text-sm font-medium text-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <AppIcon icon={Add01Icon} size={18} title="New chat" />
            New chat
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {chatHistory.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-dim">
              No chats yet
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {chatHistory.map((chat) => {
                const active = chat.id === activeChatId;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => selectChat(chat.id)}
                      disabled={actionsDisabled && !active}
                      className={`flex w-full items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
                        active
                          ? "bg-accent-soft text-foreground"
                          : "text-muted hover:bg-surface-hover hover:text-foreground"
                      }`}
                    >
                      <span className="mt-0.5 shrink-0 text-muted-dim">
                        <AppIcon
                          icon={BubbleChatIcon}
                          size={16}
                          title={chat.title}
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {chat.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-dim">
                          <span className="truncate">
                            {chat.snippet || "Empty chat"}
                          </span>
                          <span className="shrink-0">
                            {formatWhen(chat.updatedAt)}
                          </span>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
