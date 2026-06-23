import type { ReactNode } from "react";
// ---- Minimal persona sketches (inline SVG, single-stroke style) ----

function SketchBase({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      {children}
    </svg>
  );
}

export function SketchPensioner() {
  // Elderly woman: bun, oval glasses, soft shawl
  return (
    <SketchBase>
      {/* hair bun */}
      <ellipse cx="50" cy="22" rx="7" ry="4" />
      {/* head */}
      <path d="M34 42c0-9 7-16 16-16s16 7 16 16v4c0 9-7 16-16 16s-16-7-16-16z" />
      {/* glasses */}
      <circle cx="43" cy="42" r="4" />
      <circle cx="57" cy="42" r="4" />
      <path d="M47 42h6" />
      {/* gentle smile */}
      <path d="M45 52c2 2 8 2 10 0" />
      {/* shawl shoulders */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      <path d="M38 70l12 8 12-8" />
    </SketchBase>
  );
}

export function SketchSkeptic() {
  // Furrowed brow, reading glasses on nose tip, pursed mouth, paper
  return (
    <SketchBase>
      <circle cx="48" cy="38" r="15" />
      {/* furrowed brows angling down toward nose */}
      <path d="M37 32l9 3" />
      <path d="M59 32l-9 3" />
      {/* eyes — narrowed */}
      <path d="M40 38c1-1 4-1 5 0" />
      <path d="M51 38c1-1 4-1 5 0" />
      {/* nose */}
      <path d="M48 42v4" />
      {/* tight mouth */}
      <path d="M44 50h8" />
      {/* shoulders */}
      <path d="M22 88c4-14 14-22 26-22s22 8 26 22" />
      {/* paper held in hand */}
      <path d="M62 74h16v14H62z" />
      <path d="M65 78h10M65 82h10M65 86h6" />
    </SketchBase>
  );
}

export function SketchEco() {
  // Sprout leaf above head, bright eyes, peaceful smile
  return (
    <SketchBase>
      {/* leaf sprout */}
      <path d="M50 22c-5-2-9-7-6-13 6 1 9 6 6 13z" />
      <path d="M50 22c5-2 9-7 6-13-6 1-9 6-6 13z" />
      <path d="M50 22v8" />
      {/* head */}
      <circle cx="50" cy="40" r="14" />
      {/* bright open eyes */}
      <circle cx="44" cy="40" r="1.2" fill="currentColor" />
      <circle cx="56" cy="40" r="1.2" fill="currentColor" />
      {/* smile */}
      <path d="M44 48c2 3 10 3 12 0" />
      {/* shoulders with small leaf pin */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      <path d="M64 78c2-1 4 0 4 3 0 2-2 3-4 2z" />
    </SketchBase>
  );
}

export function SketchPenny() {
  // Glasses, tight mouth, calculator + currency symbol
  return (
    <SketchBase>
      <circle cx="46" cy="38" r="14" />
      {/* glasses */}
      <circle cx="41" cy="38" r="3.5" />
      <circle cx="51" cy="38" r="3.5" />
      <path d="M44.5 38h3" />
      {/* thinking mouth */}
      <path d="M42 48l8-2" />
      {/* shoulders */}
      <path d="M20 90c4-14 12-22 26-22s22 8 26 22" />
      {/* calculator */}
      <rect x="64" y="20" width="20" height="26" rx="2" />
      <path d="M67 26h14" />
      <path d="M68 32h2M73 32h2M78 32h2M68 38h2M73 38h2M78 38h2" />
      {/* currency symbol CZK floating */}
      <path d="M70 56h2v8M72 60l4-4M72 60l4 4" />
    </SketchBase>
  );
}

export function SketchAbsentee() {
  // Back-of-head silhouette facing away, paper airplane flying off with dashed trail
  return (
    <SketchBase>
      {/* back of head — smooth bald dome */}
      <path d="M38 44c0-8 5-15 12-15s12 7 12 15v6" />
      {/* neck */}
      <path d="M45 50c0 4 0 7-1 9M55 50c0 4 0 7 1 9" />
      {/* ear hint on the right (turned slightly) */}
      <path d="M62 44c2 0 3 2 3 4s-1 4-3 4" />
      {/* shoulders / upper back */}
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" />
      {/* paper airplane upper-right */}
      <path d="M74 18l12 4-10 5-2 5-2-6-4-2z" />
      <path d="M76 27l4-4" />
      {/* dashed flight trail from nape to airplane */}
      <path d="M52 50 Q 64 38 74 22" strokeDasharray="2 4" opacity="0.5" fill="none" />
    </SketchBase>
  );
}

export function SketchNewcomer() {
  // Friendly face, raised waving hand, moving box at side
  return (
    <SketchBase>
      <circle cx="46" cy="38" r="14" />
      {/* eyes */}
      <circle cx="41" cy="38" r="1.2" fill="currentColor" />
      <circle cx="51" cy="38" r="1.2" fill="currentColor" />
      {/* big friendly smile */}
      <path d="M40 46c3 4 10 4 12 0" />
      {/* shoulders */}
      <path d="M20 90c4-14 12-22 26-22s22 8 26 22" />
      {/* waving arm + hand */}
      <path d="M60 68l10-14" />
      <path d="M70 54c-2-2-1-6 2-7s5 2 4 5l-2 4z" />
      {/* small motion lines */}
      <path d="M76 46l3-3M80 50l3-2M78 56l3-1" opacity="0.6" />
    </SketchBase>
  );
}

export function SketchCustom() {
  return (
    <SketchBase>
      <circle cx="50" cy="38" r="14" strokeDasharray="3 3" />
      <path d="M22 90c4-14 14-22 28-22s24 8 28 22" strokeDasharray="3 3" />
      <path d="M50 22v-8M44 18l12 0" />
      <path d="M44 38h2M54 38h2" />
      <path d="M44 46c2 2 8 2 12 0" />
    </SketchBase>
  );
}
