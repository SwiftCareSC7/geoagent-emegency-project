'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Ambulance,
  Activity,
  AlertTriangle,
  MapPin,
  Route as RouteIcon,
  Cpu,
  BrainCircuit,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Eye,
  X,
  Code,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { adminApi } from '@/lib/api/admin'
import type { AdminPagination, AdminQueryParams } from '@/lib/api/types'
import { Button } from '@/components/ui/button'

type CollectionTab =
  | 'users'
  | 'vehicles'
  | 'emergencies'
  | 'incidents'
  | 'trajectories'
  | 'routes'
  | 'predictions'
  | 'decisions'

interface TabConfig {
  id: CollectionTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const TABS: TabConfig[] = [
  { id: 'users', label: 'Users', icon: Users, description: 'Operators & Administrators (Passwords strictly omitted)' },
  { id: 'vehicles', label: 'Vehicles', icon: Ambulance, description: 'Emergency Fleet & Operational Status' },
  { id: 'emergencies', label: 'Emergencies', icon: Activity, description: 'Active Response Missions & Assigned Units' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, description: 'Road Hazards & Congestion Obstacles' },
  { id: 'trajectories', label: 'Trajectories', icon: MapPin, description: 'High-Frequency GPS Fixes (Bounded Pagination)' },
  { id: 'routes', label: 'Routes', icon: RouteIcon, description: 'Planned & Traffic-Aware Path Geometries' },
  { id: 'predictions', label: 'Predictions', icon: Cpu, description: 'ETA & Delay Engine Quantitative Snapshots' },
  { id: 'decisions', label: 'Decisions', icon: BrainCircuit, description: 'Decision Engine Lifecycle & Audit Trails' }
]

export function AdminDatabaseExplorer() {
  const [activeTab, setActiveTab] = useState<CollectionTab>('vehicles')
  const [items, setItems] = useState<any[]>([])
  const [pagination, setPagination] = useState<AdminPagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Sorting state
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterSeverity, setFilterSeverity] = useState<string>('')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Inspection Drawer
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null)
  const [inspectMode, setInspectMode] = useState<'structured' | 'json'>('structured')

  const fetchCollectionData = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true)
      setError(null)

      try {
        const query: AdminQueryParams = {
          page: pageToLoad,
          limit: 15,
          sort: activeTab === 'trajectories' ? 'timestamp' : sortField,
          sortDir
        }

        if (search) query.search = search
        if (filterStatus) query.status = filterStatus
        if (filterPriority) query.priority = filterPriority
        if (filterSeverity) query.severity = filterSeverity

        let res: any

        switch (activeTab) {
          case 'users':
            res = await adminApi.getUsers(query)
            break
          case 'vehicles':
            res = await adminApi.getVehicles(query)
            break
          case 'emergencies':
            res = await adminApi.getEmergencies(query)
            break
          case 'incidents':
            res = await adminApi.getIncidents(query)
            break
          case 'trajectories':
            res = await adminApi.getTrajectories(query)
            break
          case 'routes':
            res = await adminApi.getRoutes(query)
            break
          case 'predictions':
            res = await adminApi.getPredictions(query)
            break
          case 'decisions':
            res = await adminApi.getDecisions(query)
            break
        }

        setItems(res.data || [])
        setPagination(
          res.pagination || {
            page: pageToLoad,
            limit: 15,
            total: res.data?.length || 0,
            totalPages: 1
          }
        )
      } catch (err: any) {
        setError(err?.message || `Failed to fetch records for ${activeTab}`)
        setItems([])
      } finally {
        setLoading(false)
      }
    },
    [activeTab, search, filterStatus, filterPriority, filterSeverity, sortField, sortDir]
  )

  // Reset page & filters when tab changes
  useEffect(() => {
    setSearch('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterSeverity('')
    setSortField(activeTab === 'trajectories' ? 'timestamp' : 'createdAt')
    setSortDir('desc')
    fetchCollectionData(1)
  }, [activeTab, fetchCollectionData])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchCollectionData(newPage)
    }
  }

  const renderStatusBadge = (status: string) => {
    const s = String(status || '').toUpperCase()
    if (['AVAILABLE', 'COMPLETED', 'RESOLVED', 'APPROVED', 'EXECUTED'].includes(s)) {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
          {s}
        </span>
      )
    }
    if (['EN_ROUTE', 'IN_PROGRESS', 'DISPATCHED', 'ACTIVE', 'PENDING_OPERATOR_ACTION'].includes(s)) {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 ring-1 ring-amber-500/20">
          {s}
        </span>
      )
    }
    if (['CRITICAL', 'REJECTED', 'CANCELLED', 'OFFLINE'].includes(s)) {
      return (
        <span className="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20">
          {s}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {s}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs for 8 Collections */}
      <div className="flex overflow-x-auto border-b border-border/50 pb-2 scrollbar-none gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Description & Filter Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/40 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {TABS.find((t) => t.id === activeTab)?.description}
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'users' && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchCollectionData(1)}
                className="h-8 w-44 rounded-lg border border-border/60 bg-background/50 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          {activeTab === 'vehicles' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border border-border/60 bg-background/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="DISPATCHED">DISPATCHED</option>
              <option value="EN_ROUTE">EN_ROUTE</option>
              <option value="AT_SCENE">AT_SCENE</option>
              <option value="RETURNING">RETURNING</option>
              <option value="OFFLINE">OFFLINE</option>
            </select>
          )}

          {activeTab === 'emergencies' && (
            <>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-background/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">PENDING</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="AT_SCENE">AT_SCENE</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </>
          )}

          {activeTab === 'incidents' && (
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="h-8 rounded-lg border border-border/60 bg-background/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          )}

          {activeTab === 'decisions' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 rounded-lg border border-border/60 bg-background/50 px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All States</option>
              <option value="PENDING_OPERATOR_ACTION">PENDING_OPERATOR_ACTION</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="EXECUTED">EXECUTED</option>
            </select>
          )}

          <Button
            onClick={() => fetchCollectionData(1)}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
          >
            <Filter className="size-3" /> Apply
          </Button>
        </div>
      </div>

      {/* Main Records Table */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-sm backdrop-blur-md">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <RefreshCw className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Querying {activeTab} collection with safe projection...</p>
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 p-8 text-center text-destructive">
            <AlertTriangle className="size-8" />
            <p className="text-sm font-semibold">{error}</p>
            <Button onClick={() => fetchCollectionData(pagination.page)} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 p-8 text-center">
            <ShieldCheck className="size-8 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No records found</p>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'predictions'
                ? 'No quantitative prediction snapshots stored yet.'
                : `The ${activeTab} collection is currently empty or no documents match active filters.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/50 bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {activeTab === 'users' && (
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'vehicles' && (
                  <tr>
                    <th className="px-4 py-3">Vehicle ID</th>
                    <th className="px-4 py-3">Reg. Number</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Driver</th>
                    <th className="px-4 py-3">Hospital</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'emergencies' && (
                  <tr>
                    <th className="px-4 py-3">Emergency ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Location [Lng, Lat]</th>
                    <th className="px-4 py-3">Assigned Vehicle</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'incidents' && (
                  <tr>
                    <th className="px-4 py-3">Incident ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Coordinates</th>
                    <th className="px-4 py-3">Reported By</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'trajectories' && (
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Coordinates [Lng, Lat]</th>
                    <th className="px-4 py-3">Speed (km/h)</th>
                    <th className="px-4 py-3">Heading</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'routes' && (
                  <tr>
                    <th className="px-4 py-3">Route ID</th>
                    <th className="px-4 py-3">Provider</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Distance</th>
                    <th className="px-4 py-3">Duration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'predictions' && (
                  <tr>
                    <th className="px-4 py-3">Vehicle</th>
                    <th className="px-4 py-3">Predicted ETA</th>
                    <th className="px-4 py-3">Baseline ETA</th>
                    <th className="px-4 py-3">Delay Risk</th>
                    <th className="px-4 py-3">Route Risk</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
                {activeTab === 'decisions' && (
                  <tr>
                    <th className="px-4 py-3">Decision ID</th>
                    <th className="px-4 py-3">Emergency</th>
                    <th className="px-4 py-3">Primary Action</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-border/40 font-mono text-xs">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                    {activeTab === 'users' && (
                      <>
                        <td className="px-4 py-3 font-sans font-medium text-foreground">{row.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.role)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
                        </td>
                      </>
                    )}
                    {activeTab === 'vehicles' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.vehicleId}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.registrationNumber}</td>
                        <td className="px-4 py-3">{row.type}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 font-sans">{row.driverName}</td>
                        <td className="px-4 py-3 font-sans text-muted-foreground">{row.hospitalName || '—'}</td>
                      </>
                    )}
                    {activeTab === 'emergencies' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.emergencyId}</td>
                        <td className="px-4 py-3">{row.type}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.priority)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          [{row.location?.coordinates?.[0]?.toFixed(4)}, {row.location?.coordinates?.[1]?.toFixed(4)}]
                        </td>
                        <td className="px-4 py-3 font-sans">
                          {row.assignedVehicle?.vehicleId ? (
                            <span className="font-semibold text-primary">{row.assignedVehicle.vehicleId}</span>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                        </td>
                      </>
                    )}
                    {activeTab === 'incidents' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.incidentId}</td>
                        <td className="px-4 py-3">{row.type}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.severity)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          [{row.location?.coordinates?.[0]?.toFixed(4)}, {row.location?.coordinates?.[1]?.toFixed(4)}]
                        </td>
                        <td className="px-4 py-3 font-sans text-muted-foreground">{row.reportedBy?.name || '—'}</td>
                      </>
                    )}
                    {activeTab === 'trajectories' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.vehicle?.vehicleId || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          [{row.location?.coordinates?.[0]?.toFixed(5)}, {row.location?.coordinates?.[1]?.toFixed(5)}]
                        </td>
                        <td className="px-4 py-3">{row.speed}</td>
                        <td className="px-4 py-3">{row.heading}°</td>
                        <td className="px-4 py-3">{row.source}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : '—'}
                        </td>
                      </>
                    )}
                    {activeTab === 'routes' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.routeId}</td>
                        <td className="px-4 py-3">{row.provider}</td>
                        <td className="px-4 py-3">{row.routeType}</td>
                        <td className="px-4 py-3">{(row.distance / 1000).toFixed(1)} km</td>
                        <td className="px-4 py-3">{Math.round(row.duration / 60)} min</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.status)}</td>
                      </>
                    )}
                    {activeTab === 'predictions' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.vehicle?.vehicleId || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.predictedEta ? new Date(row.predictedEta).toLocaleTimeString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.baselineEta ? new Date(row.baselineEta).toLocaleTimeString() : '—'}
                        </td>
                        <td className="px-4 py-3">{renderStatusBadge(row.delayRisk)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.routeRisk)}</td>
                        <td className="px-4 py-3 font-semibold text-primary">{row.confidence}</td>
                      </>
                    )}
                    {activeTab === 'decisions' && (
                      <>
                        <td className="px-4 py-3 font-bold text-foreground">{row.decisionId}</td>
                        <td className="px-4 py-3 font-sans text-muted-foreground">{row.emergency?.emergencyId || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-foreground">{row.primaryAction}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.severity)}</td>
                        <td className="px-4 py-3">{renderStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.createdAt ? new Date(row.createdAt).toLocaleTimeString() : '—'}
                        </td>
                      </>
                    )}
                    <td className="px-4 py-3 text-right">
                      <Button
                        onClick={() => setSelectedRecord(row)}
                        variant="ghost"
                        size="sm"
                        className="size-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing Page <span className="font-semibold text-foreground">{pagination.page}</span> of{' '}
            <span className="font-semibold text-foreground">{pagination.totalPages}</span> ({pagination.total} total records)
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Record Inspector Drawer / Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Record Inspector: {activeTab.toUpperCase()}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {selectedRecord.id || selectedRecord._id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setInspectMode(inspectMode === 'structured' ? 'json' : 'structured')}
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                >
                  <Code className="size-3" />
                  {inspectMode === 'structured' ? 'Raw JSON' : 'Structured View'}
                </Button>
                <Button
                  onClick={() => setSelectedRecord(null)}
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto pr-1">
              {inspectMode === 'structured' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  {Object.entries(selectedRecord).map(([key, val]) => {
                    // Skip internal fields
                    if (key === '__v' || key === 'password') return null
                    const displayVal =
                      typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : String(val)
                    return (
                      <div key={key} className="rounded-xl border border-border/30 bg-muted/20 p-3">
                        <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                          {key}
                        </span>
                        <pre className="mt-1 font-mono text-foreground whitespace-pre-wrap break-all text-xs">
                          {displayVal}
                        </pre>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <pre className="rounded-xl border border-border/40 bg-zinc-950 p-4 font-mono text-xs text-zinc-100 overflow-x-auto">
                  {JSON.stringify(selectedRecord, null, 2)}
                </pre>
              )}
            </div>

            <div className="mt-4 border-t border-border/40 pt-3 text-right">
              <Button onClick={() => setSelectedRecord(null)} variant="outline" size="sm">
                Close Inspector
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
