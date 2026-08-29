import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4rem)] items-center overflow-hidden">
      {/* Background image placeholder */}
      <img
        src="/hero-ambulance.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover"
      />
      {/* Dark overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-br from-navy/90 via-navy/75 to-navy/60"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-white/90 uppercase">
            <span className="size-2 rounded-full bg-critical" />
            Emergency response, optimized
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] text-balance text-white sm:text-5xl lg:text-6xl">
            EVERY SECOND MATTERS.
            <br />
            <span className="text-white/90">WE GET YOU THERE FASTER.</span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg">
            SwiftCare GeoAgent monitors live route conditions, predicts delays,
            and recommends smarter routes so ambulances reach patients in the
            shortest possible time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-critical px-6 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-critical/90"
            >
              REGISTER NOW
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/driver/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Driver Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
