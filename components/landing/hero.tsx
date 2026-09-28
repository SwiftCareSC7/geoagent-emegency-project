'use client'

import { ArrowRight, Navigation } from 'lucide-react'
import Link from 'next/link'

export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-3.5rem)] items-center overflow-hidden border-b border-border">
      {/* Background image */}
      <img
        src="/hero-ambulance.png"
        alt="SwiftCare Emergency Ambulance"
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover brightness-[1.15] contrast-[1.04]"
      />
      {/* Directional overlay: dark on left for text legibility, much lighter on right to make the photo bright and visible */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#060a13]/90 via-[#060a13]/60 to-[#060a13]/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#060a13] via-transparent to-[#060a13]/40"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(2,132,199,0.15) 50%, transparent 70%)',
        }}
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-mono font-bold tracking-wide text-emerald-400 uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Emergency response, optimized</span>
          </div>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            EVERY SECOND MATTERS.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              WE GET YOU THERE FASTER.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 sm:text-lg">
            SwiftCare GeoAgent monitors live route conditions, predicts delays,
            and recommends smarter routes so ambulances reach patients in the
            shortest possible time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm sm:text-base font-bold text-white shadow-lg shadow-emerald-950/50 transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <span>REGISTER NOW</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/driver/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-6 py-3.5 text-sm sm:text-base font-semibold text-white transition-all hover:bg-white/15 hover:border-white/30 active:scale-[0.98]"
            >
              <Navigation className="size-4 text-cyan-400" />
              <span>View Driver Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
