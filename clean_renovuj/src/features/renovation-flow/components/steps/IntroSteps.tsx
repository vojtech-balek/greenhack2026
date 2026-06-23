import { GOALS } from "../../constants";
import { buildingsAsset } from "../../model";
import { StepShell } from "../shells";
export function HeroStep({
  address,
  setAddress,
}: {
  address: string;
  setAddress: (v: string) => void;
}) {
  return (
    <StepShell topPadding="hero">
      <h1 className="font-display max-w-[18ch] text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-[4rem] md:text-[5.5rem] lg:text-[6.25rem]">
        <span className="block text-foreground">Your first step</span>
        <span className="block text-foreground/35">
          to collective renovation.
        </span>
      </h1>

      <div className="relative mt-1 sm:mt-2">
        <img
          src={buildingsAsset.url}
          alt="Row of European apartment buildings at dusk with warm window lights"
          className="relative mx-auto w-full select-none animate-hero-drift"
          draggable={false}
        />
      </div>
    </StepShell>
  );
}


export function GoalsStep({
  selected,
  toggleGoal,
}: {
  selected: Set<string>;
  toggleGoal: (id: string) => void;
}) {
  return (
    <StepShell topPadding="tight">
      <StepHeader
        title="What is the goal of your renovation?"
        subtitle="Pick whatever feels right, we'll take it from there."
        subtitleVariant="italic"
      />


      <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
        {GOALS.map(({ id, label, Icon }) => {
          const isOn = selected.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleGoal(id)}
              className={[
                "group flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition",
                "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-18px_rgba(0,0,0,0.3)]",
                isOn
                  ? "border-foreground/80 bg-foreground/[0.04]"
                  : "border-border/70 bg-background/40",
              ].join(" ")}
              aria-pressed={isOn}
            >
              <span
                className={[
                  "grid h-20 w-20 place-items-center rounded-2xl transition",
                  isOn
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground/80 group-hover:bg-muted/80",
                ].join(" ")}
              >
                <Icon className="h-9 w-9" strokeWidth={1.5} />
              </span>
              <span className="text-sm font-medium text-foreground/85 sm:text-[0.95rem]">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}
