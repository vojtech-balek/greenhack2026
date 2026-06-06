import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — renovuj.me" },
      { name: "description", content: "Get in touch with the renovuj.me team." },
      { property: "og:title", content: "Contact — renovuj.me" },
      { property: "og:description", content: "Get in touch with the renovuj.me team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
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
          <Link to="/contact" className="transition hover:text-foreground">
            Contact us
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex min-h-screen w-full max-w-[640px] flex-col items-center justify-center px-6 text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground animate-blur-in-soft">
          Contact
        </p>
        <h1 className="font-display mt-5 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[3rem] animate-blur-in">
          Let's talk.
        </h1>
        <p className="mt-6 max-w-[40ch] text-[1.05rem] leading-[1.6] text-foreground/70 animate-blur-in-soft">
          Questions, ideas, or want a second pair of eyes on your building's
          renovation plan? Reach out — we read every message.
        </p>

        <a
          href="mailto:vojta.balek@email.cz"
          className="mt-10 inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/60 px-6 py-3 font-display text-base font-medium text-foreground shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition hover:border-foreground/30 animate-blur-in-soft"
        >
          <Mail className="h-4 w-4 text-foreground/70" />
          vojta.balek@email.cz
        </a>
      </section>
    </main>
  );
}
