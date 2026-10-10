import React, { Suspense } from 'react'
import { LoginForm } from '@/components/auth/LoginForm'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'Sign In — SwiftCare GeoAgent',
  description: 'Authoritative operational authentication for SwiftCare emergency personnel.'
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-svh flex items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
