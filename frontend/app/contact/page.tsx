import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact | Educatorio",
  description: "Contact Educatorio for learner support, organization inquiries, and partnership questions.",
};

const location = "Duplex, Jalan PJS 11/26, Bandar Sunway, 47500 Subang Jaya, Selangor";
const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;

const contactMethods = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@educatorio.example",
    helper: "For general questions and learner support",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+60 3-7821 4488",
    helper: "Monday to Friday, 9:00 AM - 6:00 PM",
  },
//   {
//     icon: MessageCircle,
//     label: "Live Chat",
//     value: "Available on weekdays",
//     helper: "Usually replies within a few minutes",
//   },
];

const officeDetails = [
  { label: "Office", value: "Educatorio Sunway Learning Hub" },
  { label: "Address", value: location },
  { label: "Business Hours", value: "Mon - Fri, 9:00 AM - 6:00 PM" },
];

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#0B0B0F] via-[#0F0F1A] to-[#1A0B2E] text-white selection:bg-purple-500/30">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0B0B0F]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/50">
                <span className="text-lg font-black text-white">E</span>
              </div>
              <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-xl font-bold tracking-tight text-transparent transition-all duration-300 group-hover:to-white">
                Educatorio
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="group relative hidden overflow-hidden rounded-xl border border-white/10 px-5 py-2 text-sm font-semibold text-gray-300 transition-all duration-300 hover:scale-105 hover:border-purple-500/40 hover:bg-purple-500/5 hover:text-white sm:inline-flex"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-purple-500/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative flex items-center gap-1">Log In</span>
              </Link>

              <Link
                href="/register"
                className="group relative inline-flex overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-violet-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-2">
                  Sign Up
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
          <div className="absolute right-0 top-20 h-[400px] w-[400px] rounded-full bg-pink-600/15 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />

          <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20">
            <div className="mb-14 max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">
                  Contact Educatorio
                </span>
              </div>
              <h1 className="mb-6 text-5xl font-extrabold leading-[1.1] tracking-tight md:text-7xl">
                Let's help you find the{" "}
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-violet-500 bg-clip-text text-transparent">
                  right learning path
                </span>
                .
              </h1>
              <p className="max-w-2xl bg-gradient-to-r from-gray-300 to-gray-400 bg-clip-text text-xl leading-relaxed text-transparent">
                Reach out for learner support, organization training questions, or partnership inquiries.
                Our team is based in Bandar Sunway and ready to help.
              </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-5">
                {contactMethods.map(({ icon: Icon, label, value, helper }) => (
                  <div
                    key={label}
                    className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/40 hover:bg-white/[0.05] hover:shadow-purple-500/10"
                  >
                    <div className="flex gap-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 transition-colors group-hover:bg-purple-500/20">
                        <Icon size={22} className="text-purple-400" />
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          {label}
                        </p>
                        <p className="text-xl font-bold text-white">{value}</p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-400">{helper}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#16161F]/80 shadow-2xl shadow-purple-500/10 backdrop-blur-xl">
                <div className="p-6 md:p-8">
                  <div className="mb-6 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg shadow-purple-500/30">
                      <MapPin size={24} className="text-white" />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-purple-400">
                        Visit Us
                      </p>
                      <h2 className="text-2xl font-bold text-white">Bandar Sunway Office</h2>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {officeDetails.map((detail) => (
                      <div key={detail.label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
                          {detail.label}
                        </p>
                        <p className="text-sm leading-relaxed text-gray-300">{detail.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10">
                  <iframe
                    title="Educatorio Bandar Sunway location map"
                    src={mapSrc}
                    className="h-[360px] w-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          <div className="relative overflow-hidden rounded-[32px] border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-violet-600/10 p-10 text-center md:p-12">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-[80px]" />
            <div className="relative">
              <Clock size={36} className="mx-auto mb-4 text-purple-400" />
              <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-white">
                Need help choosing a course?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-gray-400">
                Tell us your learning goals and we will point you toward a course, certificate, or
                organization plan that fits.
              </p>
              <Link
                href="/courses"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-violet-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-purple-500/30 transition-all hover:scale-[1.02] hover:from-purple-400 hover:to-violet-500"
              >
                Explore Courses <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
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
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Resources</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/contact" className="transition hover:text-purple-400">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/privacy" className="transition hover:text-purple-400">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-purple-400">
                    Terms of Service
                  </Link>
                </li>
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
