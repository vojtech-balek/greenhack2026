import { ArrowRight, Download, FileText, MessagesSquare, Printer } from "lucide-react";
import type { ComponentType } from "react";
// ============================================================
// DistributionStep — final action: download toolkit + specialist CTA
// ============================================================

type Asset = {
  id: string;
  step: string;
  title: string;
  format: string;
  description: string;
  primary: { label: string; icon: ComponentType<{ className?: string }> };
  Icon: ComponentType<{ className?: string }>;
  color: string;
};

const ASSETS: Asset[] = [
  {
    id: "cheatsheet",
    step: "01",
    title: "Hallway cheat-sheet",
    format: "",
    description: "All the key numbers in one place, plus a tailored approach for every type of neighbour — and a reminder this is also about cleaner air, quieter evenings, and a warmer home.",
    primary: { label: "Download", icon: Download },
    Icon: FileText,
    color: "hsl(20 85% 55%)",
  },
  {
    id: "chat",
    step: "02",
    title: "Group chat message",
    format: "",
    description: "A warm opener to start the conversation in your building's WhatsApp or Messenger group.",
    primary: { label: "Copy", icon: MessagesSquare },
    Icon: MessagesSquare,
    color: "hsl(150 60% 42%)",
  },
  {
    id: "flyer",
    step: "03",
    title: "Notice-board flyer",
    format: "",
    description: "A printable A4 to hand out or pin up, so neighbours have something to take home and think about.",
    primary: { label: "Download", icon: Printer },
    Icon: Printer,
    color: "hsl(210 75% 52%)",
  },
];


export function DistributionStep({
  generatingId,
  onDownloadPdf,
  onGenerateWhatsapp,
}: {
  generatingId: string | null;
  onDownloadPdf: (id: string) => void;
  onGenerateWhatsapp: () => void;
}) {
  return (
    <section className="relative min-h-screen w-full">
      <div className="animate-blur-in mx-auto min-h-screen w-full max-w-[1100px] px-8 pt-32 pb-32">
        <h2 className="font-display text-[2.25rem] font-semibold tracking-[-0.02em] text-foreground sm:text-[2.75rem]">
          It's time to act.
        </h2>
        <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          As promised, we've got your back. Here's everything you need to bring your neighbours along.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ASSETS.map((a) => (
            <article
              key={a.id}
              style={{ borderColor: a.color }}
              className="flex flex-col gap-6 rounded-2xl border-2 bg-background p-7 transition hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-20px_rgba(0,0,0,0.25)]"
            >
              <div className="flex items-start justify-between">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl border"
                  style={{
                    borderColor: `${a.color}66`,
                    backgroundColor: `${a.color}1A`,
                    color: a.color,
                  }}
                >
                  <a.Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-xs tracking-[0.14em] text-muted-foreground">
                  {a.step}
                </span>
              </div>

              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  {a.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                  {a.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (a.id === "chat") {
                    onGenerateWhatsapp();
                  } else {
                    onDownloadPdf(a.id);
                  }
                }}
                disabled={generatingId !== null}
                style={{ backgroundColor: a.color }}
                className="mt-auto inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <a.primary.icon className="h-4 w-4" />
                {generatingId === a.id ? "Generating..." : a.primary.label}
              </button>
            </article>
          ))}
        </div>


        {/* Prominent, caring CTA */}
        <div className="mt-12 rounded-3xl border border-primary/20 bg-primary/[0.04] p-8 md:p-10">
          <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div className="max-w-[50ch]">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Need a bit more help?
              </h3>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                If you'd like more precise answers, advice on what to do next,
                or just someone to talk it through with — book a quick call.
                It's completely free, no strings attached.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
            >
              Book a free call
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Buena suggestion */}
        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-6 md:p-7">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Interested in more positive changes?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                We'd suggest moving your property management to an innovative,
                AI-supported platform.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold tracking-tight text-foreground">
              <span
                aria-hidden
                className="grid h-5 w-5 place-items-center rounded-full bg-foreground text-[10px] font-bold text-background"
              >
                B
              </span>
              Buena
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
