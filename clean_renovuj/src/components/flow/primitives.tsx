// =====================================================================
// Shared step primitives.
//
// Anything that was copy-pasted across step components with the same
// classes lives here, so the visual language stays unified and a single
// edit propagates everywhere.
// =====================================================================
import * as React from "react";
import { ArrowRight } from "lucide-react";

// ---------- PrimaryButton ----------------------------------------------
// The "Continue / Proceed" CTA at the bottom of every step.
// Default = pill-shaped, primary-coloured, trailing ArrowRight.

type PrimaryButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Hide the trailing arrow (rare — only for non-forward actions). */
  hideArrow?: boolean;
  /** Slightly smaller size used inside inline forms. */
  size?: "md" | "sm";
};

export function PrimaryButton({
  children,
  hideArrow = false,
  size = "md",
  className = "",
  type = "button",
  ...rest
}: PrimaryButtonProps) {
  const sizing =
    size === "sm"
      ? "px-6 py-3 text-sm"
      : "px-7 py-3 text-base shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)]";
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-primary-foreground transition",
        "enabled:hover:scale-[1.02] enabled:active:scale-95",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100",
        sizing,
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
      {!hideArrow && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

// ---------- ContinueRow ------------------------------------------------
// `flex justify-end` wrapper around a PrimaryButton — used at the bottom
// of every step to send the user forward.

export function ContinueRow({
  onClick,
  label = "Proceed",
  topMargin = "mt-10",
}: {
  onClick: () => void;
  label?: React.ReactNode;
  topMargin?: string;
}) {
  return (
    <div className={[topMargin, "flex justify-end"].join(" ")}>
      <PrimaryButton onClick={onClick}>{label}</PrimaryButton>
    </div>
  );
}

// ---------- StepHeader -------------------------------------------------
// h2 title + optional subtitle, with the same scale + spacing rhythm on
// every step. Subtitle variant 'italic' matches the early steps; 'plain'
// matches the later, denser steps.

type StepHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Title scale. 'lg' is the default (used 5×); 'md' is the Summary scale. */
  size?: "lg" | "md";
  /** Subtitle styling. */
  subtitleVariant?: "plain" | "italic";
  /** Max width for the subtitle paragraph. */
  subtitleMaxWidth?: string;
};

export function StepHeader({
  title,
  subtitle,
  size = "lg",
  subtitleVariant = "plain",
  subtitleMaxWidth = "max-w-[60ch]",
}: StepHeaderProps) {
  const titleClass =
    size === "md"
      ? "font-display text-[1.75rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.25rem]"
      : "font-display text-[2rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.5rem]";

  const subtitleClass =
    subtitleVariant === "italic"
      ? "mt-2 text-sm italic text-muted-foreground sm:text-base"
      : "mt-3 text-base leading-relaxed text-muted-foreground";

  return (
    <>
      <h2 className={titleClass}>{title}</h2>
      {subtitle && (
        <p className={[subtitleClass, subtitleMaxWidth].join(" ")}>{subtitle}</p>
      )}
    </>
  );
}

// ---------- SectionLabel -----------------------------------------------
// The tiny uppercase eyebrow label that sits above hero numbers and
// section headings. Appears 10+ times across the financial / urgency /
// summary steps.

export function SectionLabel({
  children,
  className = "",
  as: Tag = "p",
}: {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}) {
  return (
    <Tag
      className={[
        "text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}

// ---------- OptionPill -------------------------------------------------
// Toggleable rounded-full pill used for yes/no answers and multi-option
// chips in the property questionnaire (and anywhere else we need a
// selectable chip).

type OptionPillProps = {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** 'md' = yes/no answer width, 'sm' = compact option chip. */
  size?: "md" | "sm";
};

export function OptionPill({
  selected,
  onClick,
  children,
  size = "sm",
}: OptionPillProps) {
  const sizing =
    size === "md"
      ? "min-w-[110px] px-6 py-2.5 text-sm font-medium"
      : "px-4 py-2 text-sm";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "rounded-full border transition",
        sizing,
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border/70 bg-background/40 text-foreground/80 hover:border-foreground/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ---------- StepNavArrowButton -----------------------------------------
// The small chevron up/down buttons that bracket the side step-nav dots.

export function StepNavArrowButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/70 text-foreground/70 shadow-[0_6px_20px_-10px_rgba(0,0,0,0.3)] backdrop-blur-md transition hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border/60 disabled:hover:text-foreground/70"
    >
      {children}
    </button>
  );
}
