import { redirect } from 'next/navigation'

// No sign-in: the site opens straight on the operational dashboard.
export default function Home() {
  redirect('/control-room')
}
