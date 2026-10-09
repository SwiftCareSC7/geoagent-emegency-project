import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'
import { getUserById, ROLES, STATUSES, toPublic, updateUser, type Role, type Status } from '@/lib/auth/db'
import { requireAdmin, unavailable } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const fail = (status: number, error: string) => NextResponse.json({ success: false, error, message: error }, { status })

/** PATCH /api/admin/users/:id/(approve|reject|suspend|status|role): admin-only, enforced here. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id, action } = (await params) as { id: string; action: string }
  const backendUrl = getBackendUrl()

  // 1. Authoritative Express backend when configured
  if (backendUrl) {
    try {
      const body = await request.text()
      const backendRes = await fetch(`${backendUrl}/api/admin/users/${id}/${action}`, {
        method: 'PATCH',
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        headers: {
          'Content-Type': 'application/json',
          cookie: request.headers.get('cookie') || '',
          authorization: request.headers.get('authorization') || '',
        },
        body: body || '{}',
        next: { revalidate: 0 },
      })
      const data = await backendRes.json()
      return NextResponse.json(data, { status: backendRes.status })
    } catch (err) {
      console.error('[BFF] admin/users action proxy failed:', err instanceof Error ? err.message : 'error')
      return fail(503, 'Admin service temporarily unavailable')
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    return fail(503, 'Admin service temporarily unavailable')
  }

  // 3. Local offline test fallback (non-production only)
  try {
    const gate = requireAdmin(request)
    if (gate.error) return gate.error
    const admin = gate.user

    const target = getUserById(id)
    if (!target) return fail(404, 'User not found')
    const body = await request.json().catch(() => ({}))

    // Block self-lockout/self-elevation: an admin cannot change their own status or role.
    if (target.id === admin.id && action !== 'approve') return fail(400, 'You cannot change your own account')

    const role = body.role as Role | undefined
    if (role !== undefined && !ROLES.includes(role)) return fail(400, 'Invalid role')
    const workspaces = Array.isArray(body.permittedWorkspaces)
      ? (body.permittedWorkspaces.filter((w: Role) => ROLES.includes(w) && w !== 'ADMIN') as Role[])
      : undefined
    const vehicle = typeof body.assignedVehicleId === 'string' ? body.assignedVehicleId.trim() || null : undefined

    let patch: Parameters<typeof updateUser>[1]
    switch (action) {
      case 'approve': {
        // An ADMIN request is only honoured when the approving admin explicitly passes role: 'ADMIN'.
        const finalRole = role ?? target.role
        patch = {
          status: 'APPROVED', role: finalRole, permittedWorkspaces: workspaces ?? [finalRole].filter((r) => r !== 'ADMIN') as Role[],
          assignedVehicleId: vehicle, approvedBy: admin.id, approvedAt: new Date().toISOString(),
        }
        break
      }
      case 'reject': patch = { status: 'REJECTED' }; break
      case 'suspend': patch = { status: 'SUSPENDED' }; break
      case 'status': {
        if (!STATUSES.includes(body.status as Status)) return fail(400, 'Invalid status')
        patch = { status: body.status as Status }
        break
      }
      case 'role': {
        if (!role) return fail(400, 'Role is required')
        patch = { role, permittedWorkspaces: workspaces, assignedVehicleId: vehicle }
        break
      }
      default: return fail(404, 'Unknown action')
    }
    const updated = updateUser(id, patch)!
    return NextResponse.json({ success: true, message: `User ${action} successful`, data: toPublic(updated) })
  } catch (err) {
    return unavailable(err)
  }
}
