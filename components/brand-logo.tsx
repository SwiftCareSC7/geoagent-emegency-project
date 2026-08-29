'use client'

import Image from 'next/image'
import { useState } from 'react'

interface BrandLogoProps {
  /** Rendered height in pixels; width scales to preserve aspect ratio. */
  height?: number
  className?: string
  /** Styling for the text fallback shown if the image fails to load. */
  fallbackClassName?: string
  priority?: boolean
}

// Intrinsic dimensions of the trimmed logo asset (preserves aspect ratio).
const LOGO_W = 528
const LOGO_H = 162

export function BrandLogo({
  height = 40,
  className,
  fallbackClassName,
  priority,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span className={fallbackClassName ?? 'font-display font-bold'}>
        SwiftCare Ambulance Services
      </span>
    )
  }

  return (
    <Image
      src="/swiftcare-logo.png"
      alt="SwiftCare Ambulance Services"
      width={LOGO_W}
      height={LOGO_H}
      priority={priority}
      onError={() => setFailed(true)}
      // Preserve aspect ratio: fix height, let width scale automatically.
      style={{ height, width: 'auto' }}
      className={className}
    />
  )
}
