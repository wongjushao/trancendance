import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FileText, GraduationCap, ShieldCheck } from "lucide-react";

type LegalSection = {
  title: string;
  body: string[];
  items?: string[];
};

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  updatedAt: string;
  icon: LucideIcon;
  highlights: string[];
  sections: LegalSection[];
};

export default function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  icon: Icon,
  highlights,
  sections,
}: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0B0F] text-slate-100 selection:bg-purple-500/30">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#0B0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 text-sm font-black text-white shadow-lg shadow-purple-500/30">
              E
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Educatorio</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#A0A0B5] md:flex">
            <Link href="/courses" className="transition-colors hover:text-white">
              Explore
            </Link>
            <Link href="/organizations" className="transition-colors hover:text-white">
              For Business
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden items-center rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#A0A0B5] transition-all hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white sm:inline-flex"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] hover:from-purple-400 hover:to-violet-500"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative mx-auto max-w-7xl overflow-hidden px-6 pb-16 pt-20">
          <div className="pointer-events-none absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px]" />
          <div className="pointer-events-none absolute right-0 top-20 h-[400px] w-[400px] rounded-full bg-violet-600/8 blur-[120px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                <Icon size={14} />
                {eyebrow}
              </div>
              <h1 className="max-w-4xl text-5xl font-extrabold leading-[0.95] tracking-tight text-white lg:text-7xl">
                {title}
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[#A0A0B5] lg:text-xl">
                {description}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#6B6B80]">
                Last updated: {updatedAt}
              </p>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-10 rounded-full bg-purple-600/15 blur-[100px]" />
              <div className="relative rounded-[32px] border border-white/10 bg-[#16161F]/80 p-8 shadow-2xl shadow-purple-500/10 backdrop-blur-xl">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/30">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="mb-4 text-2xl font-bold text-white">What this covers</h2>
                <div className="space-y-3">
                  {highlights.map((item) => (
                    <div key={item} className="flex gap-3 text-sm leading-relaxed text-[#A0A0B5]">
                      <FileText size={16} className="mt-0.5 shrink-0 text-purple-400" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-6 pb-24 lg:grid-cols-[280px_1fr]">
          <aside className="h-fit rounded-[28px] border border-white/10 bg-[#16161F] p-6 lg:sticky lg:top-24">
            <p className="mb-5 text-[10px] font-black uppercase tracking-[0.25em] text-[#6B6B80]">
              On this page
            </p>
            <nav className="space-y-2">
              {sections.map((section) => (
                <a
                  key={section.title}
                  href={`#${section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#A0A0B5] transition-all hover:bg-purple-500/10 hover:text-white"
                >
                  {section.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            {sections.map((section) => (
              <article
                key={section.title}
                id={section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
                className="scroll-mt-24 rounded-[28px] border border-white/5 bg-[#16161F] p-6 transition-colors hover:border-purple-500/20 md:p-8"
              >
                <h2 className="mb-5 text-2xl font-bold tracking-tight text-white">{section.title}</h2>
                <div className="space-y-4 text-sm leading-7 text-[#A0A0B5] md:text-base">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul className="space-y-3 pt-1">
                      {section.items.map((item) => (
                        <li key={item} className="flex gap-3">
                          <ShieldCheck size={16} className="mt-1 shrink-0 text-purple-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-violet-600/10 p-10 text-center md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px]" />
            <div className="relative">
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white">
                Questions about these terms?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-[#A0A0B5]">
                We keep these pages readable so learners, teachers, and organizations know what to expect when using Educatorio.
              </p>
              <Link
                href="/register"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 to-violet-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02] hover:from-purple-400 hover:to-violet-500"
              >
                Start Learning <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black/40 px-6 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-violet-600 text-xs font-black text-white">
              E
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Educatorio</span>
          </Link>
          <div className="flex gap-8 text-[11px] font-bold uppercase tracking-[0.25em] text-[#6B6B80]">
            <Link href="/privacy" className="transition hover:text-purple-400">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-purple-400">
              Terms
            </Link>
            <Link href="/contact" className="transition hover:text-purple-400">
              Contact
            </Link>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#6B6B80]">
            &copy; {new Date().getFullYear()} Educatorio Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
