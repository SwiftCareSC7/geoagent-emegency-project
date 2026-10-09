'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Car,
  Filter,
  Check,
  X,
  Radio,
  Ambulance,
  Stethoscope
} from 'lucide-react'

import { adminApi } from '@/lib/api/admin'
import type { User, UserRole, UserStatus, Workspace } from '@/lib/api/types'
import { getEffectiveWorkspaces } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ROLES: UserRole[] = ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC']
const WORKSPACE_OPTIONS: Workspace[] = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN']

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (statusFilter !== 'ALL') params.status = statusFilter
      if (roleFilter !== 'ALL') params.role = roleFilter
      if (search.trim()) params.search = search.trim()

      const res = await adminApi.getUsers(params)
      setUsers(res.data)
    } catch (err: any) {
      setFeedback({
        message: err?.message || 'Failed to fetch registered personnel.',
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, roleFilter, search])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleApprove = async (userId: string) => {
    setActionLoadingId(userId)
    setFeedback(null)
    try {
      await adminApi.approveUser(userId)
      setFeedback({ message: 'User registration approved successfully.', type: 'success' })
      await loadUsers()
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Approval failed.', type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSuspend = async (userId: string) => {
    setActionLoadingId(userId)
    setFeedback(null)
    try {
      await adminApi.suspendUser(userId)
      setFeedback({ message: 'User account has been suspended.', type: 'success' })
      await loadUsers()
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Suspension failed.', type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoadingId(userId)
    setFeedback(null)
    try {
      await adminApi.updateUserRole(userId, { role: newRole })
      setFeedback({ message: `Assigned new role (${newRole}) to user.`, type: 'success' })
      await loadUsers()
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to update role.', type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleWorkspaceToggle = async (userId: string, currentRole: UserRole, currentWorkspaces: Workspace[], targetWorkspace: Workspace) => {
    setActionLoadingId(userId)
    setFeedback(null)
    try {
      const exists = currentWorkspaces.includes(targetWorkspace)
      let nextWorkspaces = exists
        ? currentWorkspaces.filter(w => w !== targetWorkspace)
        : [...currentWorkspaces, targetWorkspace]
      // Ensure primary role is included
      if (!nextWorkspaces.includes(currentRole as Workspace)) {
        nextWorkspaces.push(currentRole as Workspace)
      }
      await adminApi.updateUserRole(userId, { role: currentRole, permittedWorkspaces: nextWorkspaces })
      setFeedback({ message: `Updated permitted workspaces for user.`, type: 'success' })
      await loadUsers()
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to update workspaces.', type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleVehicleChange = async (userId: string, vehicleId: string) => {
    setActionLoadingId(userId)
    setFeedback(null)
    try {
      await adminApi.updateUserRole(userId, { assignedVehicleId: vehicleId })
      setFeedback({ message: `Updated vehicle assignment to ${vehicleId || 'none'}.`, type: 'success' })
      await loadUsers()
    } catch (err: any) {
      setFeedback({ message: err?.message || 'Failed to update vehicle assignment.', type: 'error' })
    } finally {
      setActionLoadingId(null)
    }
  }

  const counts = {
    total: users.length,
    pending: users.filter(u => u.status === 'PENDING').length,
    approved: users.filter(u => !u.status || u.status === 'APPROVED').length,
    suspended: users.filter(u => u.status === 'SUSPENDED').length
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Accounts</span>
            <Users className="size-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{counts.total}</p>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-xs font-semibold">Pending Approvals</span>
            <Clock className="size-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
            {counts.pending}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-xs font-semibold">Active Responders</span>
            <UserCheck className="size-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {counts.approved}
          </p>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400">
            <span className="text-xs font-semibold">Suspended</span>
            <UserX className="size-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
            {counts.suspended}
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by officer name or email..."
            className="w-full rounded-xl border border-input bg-background/80 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Only</option>
            <option value="APPROVED">Approved Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CONTROL_ROOM">CONTROL_ROOM</option>
            <option value="DRIVER">DRIVER</option>
            <option value="PARAMEDIC">PARAMEDIC</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadUsers}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Personnel / Identity</th>
                <th className="px-4 py-3 font-semibold">Role & Permitted Workspaces</th>
                <th className="px-4 py-3 font-semibold">Vehicle</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto size-6 animate-spin text-primary mb-2" />
                    <span>Loading personnel roster...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No accounts matching current criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const status = u.status || 'APPROVED'
                  const isPending = status === 'PENDING'
                  const isSuspended = status === 'SUSPENDED'
                  const isActing = actionLoadingId === u.id
                  const effectiveWorkspaces = getEffectiveWorkspaces(u)

                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isPending ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Name / Email */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground text-sm">{u.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{u.email}</div>
                        {u.requestedRole && u.requestedRole !== u.role && (
                          <div className="text-[10px] text-amber-500 font-mono mt-0.5">
                            Req Role: {u.requestedRole}
                          </div>
                        )}
                        {u.requestedWorkspaces && u.requestedWorkspaces.length > 0 && (
                          <div className="text-[10px] text-amber-500 font-mono mt-0.5">
                            Req Workspaces: {u.requestedWorkspaces.join(', ')}
                          </div>
                        )}
                        {u.approvedAt && (
                          <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                            Approved: {new Date(u.approvedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {/* Role Selector & Workspaces */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5">
                          <select
                            value={u.role}
                            disabled={isActing}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="rounded-lg border border-input bg-background/90 px-2 py-1 text-xs font-semibold text-foreground focus:border-primary focus:outline-none"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <div className="flex flex-wrap gap-1 items-center">
                            {WORKSPACE_OPTIONS.map((ws) => {
                              const isGranted = effectiveWorkspaces.includes(ws)
                              return (
                                <button
                                  key={ws}
                                  type="button"
                                  disabled={isActing}
                                  onClick={() => handleWorkspaceToggle(u.id, u.role, effectiveWorkspaces, ws)}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                                    isGranted
                                      ? 'bg-primary/15 text-primary border border-primary/30'
                                      : 'bg-muted text-muted-foreground/60 border border-border/50 hover:border-border hover:text-muted-foreground'
                                  }`}
                                  title={isGranted ? `Revoke ${ws} workspace` : `Grant ${ws} workspace`}
                                >
                                  {ws === 'CONTROL_ROOM' ? 'CTRL' : ws}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </td>

                      {/* Vehicle Assignment */}
                      <td className="px-4 py-3">
                        {u.role === 'DRIVER' || u.role === 'PARAMEDIC' ? (
                          <input
                            type="text"
                            defaultValue={u.assignedVehicleId || ''}
                            placeholder="AMB-01"
                            disabled={isActing}
                            onBlur={(e) => {
                              if (e.target.value !== (u.assignedVehicleId || '')) {
                                handleVehicleChange(u.id, e.target.value)
                              }
                            }}
                            className="w-24 rounded-lg border border-input bg-background/90 px-2 py-1 font-mono text-xs uppercase text-foreground focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <span className="font-mono text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
                            <Clock className="size-3" />
                            PENDING
                          </span>
                        )}
                        {!isPending && !isSuspended && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-500">
                            <CheckCircle2 className="size-3" />
                            APPROVED
                          </span>
                        )}
                        {isSuspended && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-500">
                            <UserX className="size-3" />
                            SUSPENDED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <Button
                              size="sm"
                              disabled={isActing}
                              onClick={() => handleApprove(u.id)}
                              className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-7 px-2.5"
                            >
                              <Check className="size-3" />
                              Approve
                            </Button>
                          )}

                          {!isSuspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActing}
                              onClick={() => handleSuspend(u.id)}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs h-7 px-2.5"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isActing}
                              onClick={() => handleApprove(u.id)}
                              className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 text-xs h-7 px-2.5"
                            >
                              Reactivate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
