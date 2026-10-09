import { NextRequest, NextResponse } from 'next/server'
import {
  findUserByEmail,
  usersStore,
  hashPassword,
  createToken,
  toSafeUser,
  ServerUser,
} from '@/lib/auth/server-store'
import type { UserRole } from '@/lib/api/types'
import type { Workspace } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const backendUrl = process.env.BACKEND_URL
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

  const ALLOWED_ROLES: UserRole[] = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC']
  let assignedRole: UserRole = 'CONTROL_ROOM'
  if (role) {
    if (role === 'ADMIN' || !ALLOWED_ROLES.includes(role as UserRole)) {
      assignedRole = 'CONTROL_ROOM'
    } else {
      assignedRole = role as UserRole
    }
  }

  const requestedWorkspaces: Workspace[] = Array.isArray(body.requestedWorkspaces)
    ? body.requestedWorkspaces.filter((w: any) => ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'].includes(w))
    : [assignedRole]
  if (!requestedWorkspaces.includes(assignedRole)) {
    requestedWorkspaces.unshift(assignedRole)
  }

  // 2. If external backend is reachable, try forwarding first
  if (backendUrl && !backendUrl.includes('localhost') && !backendUrl.includes('127.0.0.1')) {
    try {
      const backendRes = await fetch(`${backendUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: assignedRole,
          requestedRole: assignedRole,
          requestedWorkspaces,
          assignedVehicleId: body.assignedVehicleId || null,
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
      console.warn('[BFF] External backend registration proxy failed, using serverless fallback:', err)
    }
  }

  // 3. Check duplicate email in serverless store
  const existingUser = findUserByEmail(email)
  if (existingUser) {
    return NextResponse.json(
      { success: false, error: 'Email is already registered. Please sign in or use another email.' },
      { status: 409 }
    )
  }

  // 4. Create new user in PENDING status (quarantined until admin approval)
  const newUser: ServerUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: assignedRole,
    status: 'PENDING',
    requestedRole: assignedRole,
    requestedWorkspaces,
    permittedWorkspaces: [],
    assignedVehicleId: body.assignedVehicleId || null,
    passwordHash: hashPassword(password),
    passwords: [password],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  usersStore.set(newUser.email, newUser)

  const safeUser = toSafeUser(newUser)

  return NextResponse.json(
    {
      success: true,
      message: 'Registration submitted successfully. Account is pending administrator review.',
      user: safeUser,
    },
    { status: 201 }
  )
}
