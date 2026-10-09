import { NextRequest, NextResponse } from 'next/server'
import type { UserRole } from '@/lib/api/types'
import type { Workspace } from '@/lib/auth/roles'
import { getBackendUrl, BACKEND_TIMEOUT_MS } from '@/lib/backend-url'
import { createUser, DuplicateEmailError, ROLES, toPublic } from '@/lib/auth/db'
import { unavailable } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { name, email, password, role } = body

  // 1. Validation
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json(
      { success: false, error: 'Full name is required' },
      { status: 400 }
    )
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return NextResponse.json(
      { success: false, error: 'Email address is required' },
      { status: 400 }
    )
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { success: false, error: 'Please enter a valid email address' },
      { status: 400 }
    )
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
  if (!password || !passwordRegex.test(password)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, and a number',
      },
      { status: 400 }
    )
  }

  // Any of the four roles may be *requested*; nothing but PENDING status is granted here.
  // An ADMIN request is stored as requestedRole only; the account itself starts as CONTROL_ROOM until an admin acts.
  const requestedRole: UserRole = ROLES.includes(role as UserRole) ? (role as UserRole) : 'CONTROL_ROOM'
  const assignedRole: UserRole = requestedRole === 'ADMIN' ? 'CONTROL_ROOM' : requestedRole

  const requestedWorkspaces: Workspace[] = Array.isArray(body.requestedWorkspaces)
    ? body.requestedWorkspaces.filter((w: unknown) => ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'].includes(w as string))
    : [assignedRole]
  if (!requestedWorkspaces.includes(assignedRole)) requestedWorkspaces.unshift(assignedRole)

  // 1. Authoritative Express backend when configured
  const backendUrl = getBackendUrl()
  if (backendUrl) {
    try {
      const backendRes = await fetch(`${backendUrl}/api/auth/register`, {
        signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: assignedRole,
          requestedRole,
          requestedWorkspaces,
          assignedVehicleId: typeof body.assignedVehicleId === 'string' ? body.assignedVehicleId.trim() || null : null,
        }),
      })
      const data = await backendRes.json()
      const response = NextResponse.json(data, { status: backendRes.status })
      const setCookie = backendRes.headers.get('set-cookie')
      if (setCookie) {
        response.headers.set('set-cookie', setCookie)
      }
      return response
    } catch (err) {
      console.error('[BFF] register: backend call failed:', err instanceof Error ? err.message : 'error')
      return NextResponse.json(
        {
          success: false,
          error: 'Registration service temporarily unavailable. Please try again later.',
        },
        { status: 503 }
      )
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Registration service temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  // 3. Local offline test fallback (non-production only)
  try {
    const user = createUser({
      name: name.trim(),
      email: email.trim(),
      password,
      role: assignedRole,
      requestedRole,
      status: 'PENDING',
      requestedWorkspaces,
      assignedVehicleId: typeof body.assignedVehicleId === 'string' ? body.assignedVehicleId.trim() || null : null,
    })
    return NextResponse.json(
      { success: true, message: 'Registration submitted. An administrator must approve your account before you can sign in.', user: toPublic(user) },
      { status: 201 }
    )
  } catch (err) {
    if (err instanceof DuplicateEmailError) {
      return NextResponse.json({ success: false, error: 'Email is already registered', message: 'Email is already registered' }, { status: 409 })
    }
    return unavailable(err)
  }
}
