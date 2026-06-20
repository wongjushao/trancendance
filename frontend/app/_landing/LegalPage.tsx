import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";

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
          {/* <nav className="hidden items-center gap-8 text-sm font-medium text-[#A0A0B5] md:flex">
            <Link href="/courses" className="transition-colors hover:text-white">
              Explore
            </Link>
            <Link href="/organizations" className="transition-colors hover:text-white">
              For Business
            </Link>
          </nav> */}
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

      <footer className="border-t border-white/10 bg-black/40 pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-1">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                  <span className="text-sm font-black text-white">E</span>
                </div>
                <span className="text-lg font-bold text-white">Educatorio</span>
              </div>
              <p className="mb-4 text-sm text-gray-400">Transform your future through learning</p>
              <div className="flex gap-3">
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-purple-500/20">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg>
                </a>
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-purple-500/20">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.928-11.5c0-.213-.005-.425-.015-.636A10.04 10.04 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-purple-500/20">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451c.979 0 1.771-.773 1.771-1.729V1.729C24 .774 23.204 0 22.225 0z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/contact" className="transition hover:text-purple-400">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/privacy" className="transition hover:text-purple-400">Privacy Policy</Link></li>
                <li><Link href="/terms" className="transition hover:text-purple-400">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>&copy; {new Date().getFullYear()} Educatorio, Inc.</span>
              <span className="hidden md:inline">All rights reserved</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
