import { useEffect, useState } from "react";
export function ProcessingOverlay() {
  const tasks = [
    "Gathering data from open sources",
    "Reading your answers",
    "Stitching it all together",
    "Almost ready",
  ];
  const stepMs = 3000 / tasks.length;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(
      () => setIdx((i) => Math.min(i + 1, tasks.length - 1)),
      stepMs,
    );
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-xl animate-fade-in"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5">
        <span
          className="inline-block h-9 w-9 rounded-full border-2 border-foreground/15 border-t-foreground/70 animate-spin"
          aria-hidden
        />
        <div className="relative h-6 w-[min(320px,80vw)] overflow-hidden text-center">
          {tasks.map((t, i) => (
            <span
              key={t}
              className="absolute inset-0 flex items-center justify-center text-sm text-foreground/75 transition-all duration-700 ease-out"
              style={{
                opacity: i === idx ? 1 : 0,
                filter: i === idx ? "blur(0px)" : "blur(6px)",
                transform: i === idx ? "translateY(0)" : "translateY(4px)",
              }}
            >
              {t} ✨
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
