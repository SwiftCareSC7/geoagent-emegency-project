'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardTopbar } from '@/components/dashboard/dashboard-topbar'
import { AdminOverview } from '@/components/admin/admin-overview'
import { AdminDatabaseExplorer } from '@/components/admin/admin-database-explorer'
import { Shield, Activity, Database, Terminal } from 'lucide-react'

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'explorer'>('overview')

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Top bar with authenticated admin user info */}
        <DashboardTopbar />

        {/* Admin Navigation & Header */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Shield className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Admin Console & System Observability
                  </h1>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                    ADMIN
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Database-backed telemetry, latency monitoring, and projected record inspection.
                </p>
              </div>
            </div>

            {/* Section Switcher */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/60 p-1 backdrop-blur-sm">
              <button
                onClick={() => setActiveSection('overview')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeSection === 'overview'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity className="size-3.5" />
                System Overview
              </button>
              <button
                onClick={() => setActiveSection('explorer')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeSection === 'explorer'
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Database className="size-3.5" />
                Database Explorer
              </button>
            </div>
          </div>

          {/* Section View */}
          {activeSection === 'overview' ? <AdminOverview /> : <AdminDatabaseExplorer />}

          {/* Safe Observability Notice */}
          <footer className="mt-12 rounded-xl border border-border/30 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
            <div className="flex items-center justify-center gap-2 font-medium">
              <Terminal className="size-3.5 text-primary" />
              <span>SwiftCare GeoAgent Operational Observability Layer</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground/80">
              Direct MongoDB commands, raw query execution, and database credential exposure are strictly disabled.
              For direct developer inspection during local development, use MongoDB Compass connected to the configured local MongoDB database.
            </p>
          </footer>
        </main>
      </div>
    </ProtectedRoute>
  )
}
