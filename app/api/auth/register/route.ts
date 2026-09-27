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

  const ALLOWED_ROLES: UserRole[] = ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN']
  let assignedRole: UserRole = 'CONTROL_ROOM'
  if (role) {
    if (!ALLOWED_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please select a valid role (CONTROL_ROOM, DRIVER, PARAMEDIC, ADMIN)',
        },
        { status: 400 }
      )
    }
    assignedRole = role as UserRole
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
    // If it's the requested admin email, update credentials and re-issue token
    if (email.trim().toLowerCase() === 'spec.priyanshu@gmail.com') {
      existingUser.name = name.trim() || existingUser.name
      existingUser.role = 'ADMIN'
      existingUser.passwords = [password, ...(existingUser.passwords || [])]
      existingUser.passwordHash = hashPassword(password)
      existingUser.updatedAt = new Date().toISOString()

      const token = createToken(existingUser.id, existingUser.role)
      const safeUser = toSafeUser(existingUser)
      const response = NextResponse.json(
        { success: true, message: 'Account updated successfully', user: safeUser },
        { status: 201 }
      )
      response.cookies.set({
        name: 'token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      })
      return response
    }

    return NextResponse.json(
      { success: false, error: 'Email is already registered. Please sign in or use another email.' },
      { status: 409 }
    )
  }

  // 4. Create new user
  const newUser: ServerUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: assignedRole,
    passwordHash: hashPassword(password),
    passwords: [password],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  usersStore.set(newUser.email, newUser)

  const token = createToken(newUser.id, newUser.role)
  const safeUser = toSafeUser(newUser)

  const response = NextResponse.json(
    {
      success: true,
      message: 'Account created successfully',
      user: safeUser,
    },
    { status: 201 }
  )

  response.cookies.set({
    name: 'token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })

  return response
}
