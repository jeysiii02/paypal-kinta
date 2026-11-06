import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles, Wallet } from "lucide-react";

export const instant = false;

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 15% 10%, rgba(13,110,103,0.22), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(228,87,46,0.16), transparent 50%), linear-gradient(160deg, #071926 0%, #0d2a3d 48%, #12384d 100%)",
        }}
      />
      <div
        aria-hidden
        className="kinta-grid pointer-events-none absolute inset-0 opacity-30 mix-blend-soft-light"
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-8 sm:px-8">
        <header className="kinta-fade flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[var(--ink)] shadow-[var(--shadow)]">
              K
            </span>
            <div>
              <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-white">
                KINTA
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                Impact & recovery intelligence
              </p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            Open workspace
          </Link>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="kinta-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--teal-line)]">
              <span className="kinta-live-dot inline-block h-1.5 w-1.5 rounded-full bg-[var(--teal-bright)]" />
              PayPal + AI hackathon
            </p>
            <h1 className="kinta-rise kinta-rise-delay-1 mt-6 font-[family-name:var(--font-display)] text-5xl leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              KINTA
            </h1>
            <p className="kinta-rise kinta-rise-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
              When a supplier cancels, see the blast radius, compare recovery
              paths, and move money with PayPal — guided by AI, settled by
              evidence.
            </p>
            <div className="kinta-rise kinta-rise-delay-3 mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] shadow-[var(--shadow)] transition hover:bg-[var(--teal-soft)]"
              >
                Enter product
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/disruptions"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Start with a disruption
              </Link>
            </div>
          </div>

          <div className="kinta-rise kinta-rise-delay-3 mt-16 grid gap-4 border-t border-white/10 pt-10 sm:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "AI reads the incident",
                text: "Structured analysis without inventing legal entitlement.",
              },
              {
                icon: ShieldCheck,
                title: "Impact mapped clearly",
                text: "Dependencies classified before you commit to a path.",
              },
              {
                icon: Wallet,
                title: "PayPal executes later",
                text: "Approve first. Capture and refund only when ready.",
              },
            ].map((item) => (
              <div key={item.title} className="text-white/80">
                <item.icon className="mb-3 h-5 w-5 text-[var(--teal-line)]" />
                <p className="font-[family-name:var(--font-display)] text-lg text-white">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-white/60">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
