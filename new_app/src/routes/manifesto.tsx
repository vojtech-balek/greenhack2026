import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — renovuj.me" },
      {
        name: "description",
        content:
          "The Spaces We Share: a manifesto for renewal — why we built renovuj.me to accelerate the renovation wave.",
      },
      { property: "og:title", content: "The Spaces We Share — A Manifesto for Renewal" },
      {
        property: "og:description",
        content:
          "Why we built renovuj.me to accelerate the renovation wave in Czech apartment buildings.",
      },
    ],
  }),
  component: ManifestoPage,
});

function ManifestoPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-50 mx-auto flex w-full max-w-[1400px] items-center justify-between bg-background/60 px-8 py-4 sm:py-5 backdrop-blur-md">
        <Link
          to="/"
          className="font-display text-[1.75rem] font-bold tracking-tight text-foreground"
        >
          renovuj<span className="text-muted-foreground">.me</span>
        </Link>
        <nav className="flex items-center gap-8 text-[1.1rem] font-semibold text-foreground/80">
          <Link to="/manifesto" className="transition hover:text-foreground">
            Manifesto
          </Link>
          <Link to="/" hash="contact" className="transition hover:text-foreground">
            Contact us
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col justify-center px-6 pb-24 pt-40 sm:pt-48">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground animate-blur-in-soft">
          Manifesto
        </p>
        <h1 className="font-display mt-5 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3rem] animate-blur-in">
          The Spaces We Share
          <span className="block text-foreground/40">A Manifesto for Renewal</span>
        </h1>

        <div className="mt-12 space-y-7 text-[1.05rem] leading-[1.75] text-foreground/85 animate-blur-in-soft">
          <p>
            We look at the buildings around us and see the heart of our communities,
            yet more than half of Czech residents live in unrenovated apartment
            blocks built before 1980. This aging infrastructure causes households
            to collectively waste up to{" "}
            <span className="font-medium text-foreground">CZK 100 billion</span>{" "}
            annually on heat losses, while vital projects stall due to hidden
            anxieties, perceived complexity, and decision paralysis. We believe
            sustainability shouldn't feel like an abstract lecture or an
            insurmountable mountain of paperwork — it should simply mean a warmer,
            healthier, and more valuable home.
          </p>
          <p>
            We built this company because we refuse to let good intentions fade
            during stressful hallway arguments or empty assembly meetings. By
            providing hyper-local social proof, plain-language financial
            frameworks, and targeted psychological tools, we strip away the
            intimidating legalese and empower building initiators with total
            confidence. Our mission is to handle the heavy friction and
            de-escalate neighbor anxiety, transforming an overwhelming collective
            choice into an effortless, zero-risk path to action. Together, we are
            here to accelerate the renovation wave and breathe new life into the
            places we call home.
          </p>
        </div>

        <div className="mt-16 border-t border-border/60 pt-6">
          <p className="text-sm italic text-muted-foreground">
            With care from founders
          </p>
          <p className="mt-1 font-display text-base font-medium text-foreground">
            Vojtech &amp; Ivan
          </p>
        </div>
      </section>
    </main>
  );
}
