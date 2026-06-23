import * as React from "react";
import { useState } from "react";
import { X } from "lucide-react";

import { BodyPortal, useAskAi } from "@/components/flow/ask-ai";

import { getHouseImageUrl } from "../model";
// AiPortal is now an alias for the shared BodyPortal. Kept so existing
// call sites continue to work while we migrate them off.
const AiPortal = BodyPortal;

// ---------- Shared step shells ----------------------------------------------
// Two layout primitives every step shares so paddings, max-widths and the
// fixed-house alignment stay consistent across the whole flow.
//
// `StepShell`  — full-width pages (Hero, Goals, Stakeholder, Distribution).
//                Content is capped at 70% of the global 1400px app-container
//                (≈980px) and centered, so everything lines up with the header.
//
// `SplitShell` — two-pane pages (Property, Summary, Financials, Urgency,
//                Community). A fixed asset (house or map) sits centered in
//                the left half of the app-container; the right pane is a
//                single explicit column centered inside its half so content
//                is never flush to the viewport edge on wide monitors.

function DefaultHouseFloating({ buildingInfo }: { buildingInfo?: any }) {
  return (
    <img
      src={getHouseImageUrl(buildingInfo)}
      alt="Your property"
      className="w-full max-w-[460px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
      draggable={false}
    />
  );
}

function DefaultHouseMobile({ buildingInfo }: { buildingInfo?: any }) {
  return (
    <img
      src={getHouseImageUrl(buildingInfo)}
      alt="Your property"
      className="w-full max-w-[420px] select-none drop-shadow-[0_30px_60px_rgba(0,0,0,0.18)] animate-hero-drift"
      draggable={false}
    />
  );
}

export function StepShell({
  children,
  topPadding = "default",
}: {
  children: React.ReactNode;
  topPadding?: "default" | "hero" | "tight";
}) {
  const pad =
    topPadding === "hero"
      ? "pt-28 sm:pt-36 pb-20"
      : topPadding === "tight"
        ? "pt-28 sm:pt-32 pb-40"
        : "pt-32 pb-32";
  return (
    <section className="relative z-10 min-h-screen w-full">
      <div className={["app-container", pad].join(" ")}>
        <div className="mx-auto w-full lg:w-[70%] max-w-[980px]">
          {children}
        </div>
      </div>
    </section>
  );
}

export function SplitShell({
  children,
  leftFloating,
  leftMobile,
  buildingInfo,
}: {
  children: React.ReactNode;
  leftFloating?: React.ReactNode;
  leftMobile?: React.ReactNode;
  buildingInfo?: any;
}) {
  const { chatOpen } = useAskAi();
  const blurClasses = chatOpen
    ? "scale-[0.99] opacity-80 blur-md"
    : "scale-100 opacity-100 blur-0";
  const contentBlur = chatOpen
    ? "pointer-events-none scale-[0.99] opacity-80 blur-md"
    : "blur-0 opacity-100";

  return (
    <section className="relative min-h-screen w-full">
      {/* Fixed left pane — portaled so it stays pinned to the viewport.
          Aligned to the global app-container's left half at every width. */}
      <AiPortal>
        <div className="pointer-events-none fixed inset-0 z-30 hidden lg:block">
          <div className="app-container relative h-full">
            <aside
              className={[
                "absolute top-1/2 left-8 flex w-[calc(50%-2rem)] -translate-y-1/2 justify-center",
                "transition-[filter,transform,opacity] duration-500 ease-out",
                blurClasses,
              ].join(" ")}
              aria-hidden={chatOpen}
            >
              {leftFloating ?? <DefaultHouseFloating buildingInfo={buildingInfo} />}
            </aside>
          </div>
        </div>
      </AiPortal>

      {/* Right pane content (and the mobile-only left block stacked above it) */}
      <div
        className={[
          "animate-blur-in transition-[filter,transform,opacity] duration-500 ease-out",
          contentBlur,
        ].join(" ")}
        aria-hidden={chatOpen}
      >
        <div className="app-container py-20">
          <div className="lg:hidden mb-8 flex items-center justify-center">
            {leftMobile ?? <DefaultHouseMobile buildingInfo={buildingInfo} />}
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Spacer mirroring the fixed left pane */}
            <div className="hidden lg:block" aria-hidden />
            <div className="flex justify-center">
              <div className="w-full max-w-[560px]">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



export function AiHintBubble() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <BodyPortal>
      <div className="pointer-events-none fixed bottom-[148px] left-1/2 z-[101] -translate-x-1/2 px-4 animate-fade-in">
        <div className="pointer-events-auto relative inline-flex max-w-[300px] items-start gap-2 rounded-2xl border border-border/60 bg-background py-2 pl-3.5 pr-2 text-[12.5px] leading-snug text-foreground shadow-[0_18px_50px_-12px_rgba(0,0,0,0.25)]">
          <span className="py-0.5">
            If anything's unclear, just ask our AI below.
          </span>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border/60 bg-background" />
        </div>
      </div>
    </BodyPortal>
  );
}
