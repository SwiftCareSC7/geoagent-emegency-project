import React from 'react'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Personnel Registration — SwiftCare GeoAgent',
  description: 'Register for operational field access to the SwiftCare GeoAgent Emergency Response System.'
}

export default function RegisterPage() {
  return <SignupForm />
}
