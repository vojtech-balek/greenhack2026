import { X } from "lucide-react";
import { BodyPortal } from "./ask-ai";

/**
 * Shared glass dialog: backdrop + centered glass card + floating close-X.
 * Used by both the Ask AI overlay and the StakeholderStep persona modal.
 */
export function GlassDialog({
  open,
  onClose,
  label,
  children,
  maxWidth = 640,
  z = 95,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  maxWidth?: number;
  z?: number;
}) {
  if (!open) return null;
  return (
    <BodyPortal>
      <div
        className="fixed inset-0 flex items-center justify-center bg-background/30 px-4 py-10 backdrop-blur-xl animate-fade-in"
        style={{ zIndex: z }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={onClose}
      >
        <div
          className="relative w-full animate-scale-in rounded-3xl border border-white/40 bg-background/70 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
          style={{ maxWidth }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute -right-3 -top-3 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-background/70 text-foreground shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)] backdrop-blur-xl transition hover:scale-[1.06] active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
          {children}
        </div>
      </div>
    </BodyPortal>
  );
}
