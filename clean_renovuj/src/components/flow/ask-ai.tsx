import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";

// =====================================================================
// AskAI — single source of truth for the "Ask AI" experience.
//
// One `<AskAiProvider>` wraps the whole page. One `<AskAiBar />` and one
// `<AskAiOverlay />` are rendered once at the root (both portaled to
// <body>). Every step talks to them through `useAskAi()` and sets its
// own placeholder via `useAskAiPlaceholder("…")`.
// =====================================================================

const MOCK_AI_REPLY =
  "Here's a short, friendly take based on what we know about your building. (This is a mock answer wired to the demo flow — real answers will come from the assistant grounded in your audit, NZÚ rules, and neighbour cases.)";

const DEFAULT_PLACEHOLDER = "Ask Renovuj AI anything about your renovation…";

type AskAiContextValue = {
  question: string;
  setQuestion: (v: string) => void;
  asked: string | null;
  thinking: boolean;
  aiReply: string | null;
  chatOpen: boolean;
  submit: (e?: React.FormEvent) => void;
  close: () => void;
  placeholder: string;
  setPlaceholder: (v: string) => void;
  /** Hide the bar entirely (e.g. on hero/goals/distribution). */
  visible: boolean;
  setVisible: (v: boolean) => void;
};

const AskAiContext = createContext<AskAiContextValue | null>(null);

export function AskAiProvider({ children }: { children: React.ReactNode }) {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  const [visible, setVisible] = useState(false);

  const close = useCallback(() => {
    setAsked(null);
    setAiReply(null);
    setThinking(false);
  }, []);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const q = question.trim();
      if (!q) return;
      setAsked(q);
      setQuestion("");
      setThinking(true);
      setAiReply(null);
      try {
        const response = await fetch("/api/advisor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: q }),
        });
        const data = await response.json();
        if (response.ok && data.answer) {
          setAiReply(data.answer);
        } else {
          setAiReply(data.error || "Nepodařilo se získat odpověď od AI.");
        }
      } catch (err: any) {
        setAiReply(err.message || "Nepodařilo se připojit k serveru.");
      } finally {
        setThinking(false);
      }
    },
    [question],
  );

  const chatOpen = Boolean(asked || thinking || aiReply);

  const value = useMemo<AskAiContextValue>(
    () => ({
      question,
      setQuestion,
      asked,
      thinking,
      aiReply,
      chatOpen,
      submit,
      close,
      placeholder,
      setPlaceholder,
      visible,
      setVisible,
    }),
    [question, asked, thinking, aiReply, chatOpen, submit, close, placeholder, visible],
  );

  return <AskAiContext.Provider value={value}>{children}</AskAiContext.Provider>;
}

export function useAskAi() {
  const ctx = useContext(AskAiContext);
  if (!ctx) throw new Error("useAskAi must be used inside <AskAiProvider>");
  return ctx;
}

/**
 * Set the Ask AI bar's placeholder for the lifetime of a step. Also
 * marks the bar as visible while the step is mounted.
 */
export function useAskAiPlaceholder(placeholder: string) {
  const { setPlaceholder, setVisible } = useAskAi();
  // Use a ref so we don't re-trigger on every render of the parent.
  const prev = useRef<string | null>(null);
  useEffect(() => {
    prev.current = placeholder;
    setPlaceholder(placeholder);
    setVisible(true);
    return () => {
      setVisible(false);
    };
  }, [placeholder, setPlaceholder, setVisible]);
}

// ---------- Portal helper (shared) -----------------------------------------

export function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(<>{children}</>, document.body);
}

// ---------- Bar -------------------------------------------------------------

export function AskAiBar() {
  const { question, setQuestion, submit, placeholder, visible } = useAskAi();
  if (!visible) return null;
  return (
    <BodyPortal>
      <div className="fixed bottom-20 left-1/2 z-[100] flex w-[min(720px,calc(100%-2rem))] -translate-x-1/2 will-change-transform">
        <form
          onSubmit={submit}
          className="group relative flex w-full items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2 py-2 pl-3 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition focus-within:border-foreground/30 focus-within:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background">
            <Sparkles className="h-3.5 w-3.5" />
            Ask AI
          </span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={placeholder}
            className="h-11 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            aria-label="Ask AI"
          />
          <button
            type="submit"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:scale-[1.03] hover:opacity-95 active:scale-95"
            aria-label="Send"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </BodyPortal>
  );
}

// ---------- Overlay ---------------------------------------------------------

export function AskAiOverlay() {
  const { chatOpen, asked, thinking, aiReply, close } = useAskAi();
  if (!chatOpen) return null;
  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-background/30 px-4 pb-36 pt-10 backdrop-blur-xl animate-fade-in sm:items-center sm:pb-40"
        role="dialog"
        aria-modal="true"
        aria-label="AI assistant"
        onClick={close}
      >
        <div
          className="relative w-full max-w-[640px] animate-scale-in rounded-3xl border border-white/40 bg-background/55 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close AI chat"
            className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/60 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl backdrop-saturate-150 transition hover:scale-[1.06] hover:bg-background/80 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>

          {asked && (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md border border-foreground/15 bg-foreground/[0.06] px-4 py-3 text-sm font-medium text-foreground">
              {asked}
            </div>
          )}

          <div className="mt-4 flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="flex-1 rounded-2xl rounded-tl-md border border-white/40 bg-background/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 backdrop-blur-md">
              <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Renovuj AI
              </p>
              {thinking ? (
                <span className="inline-flex items-center gap-1.5 italic text-muted-foreground">
                  Thinking
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                </span>
              ) : (
                <span className="whitespace-pre-line">{aiReply}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
