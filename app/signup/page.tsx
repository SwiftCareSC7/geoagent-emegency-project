import Link from 'next/link'

export const metadata = {
  title: 'Sign Up — SwiftCare GeoAgent',
  description: 'Create a SwiftCare GeoAgent personnel account.'
}

export default function SignupPage() {
  return (
    <main className="min-h-svh flex items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-bold tracking-tight">Join SwiftCare GeoAgent</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Register as Driver, Paramedic or Control Room personnel. New accounts need administrator approval before first sign-in.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Register as personnel
        </Link>
        <p className="mt-5 text-xs text-muted-foreground">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
