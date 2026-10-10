import React from 'react'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Official Registration Desk — SwiftCare GeoAgent',
  description: 'Personnel credential registration for SwiftCare emergency responders.'
}

export default function RegistrationPage() {
  return <SignupForm />
}
