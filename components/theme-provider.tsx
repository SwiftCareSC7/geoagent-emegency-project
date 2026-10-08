'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

// Suppress benign React 19 development warning triggered by next-themes injecting inline script tag
if (typeof console !== 'undefined' && console.error) {
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return
    }
    originalError.apply(console, args)
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange={false}
      scriptProps={{ 'data-cfasync': 'false' }}
    >
      {children}
    </NextThemesProvider>
  )
}
