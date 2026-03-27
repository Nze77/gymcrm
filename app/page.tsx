'use client'

import MobileDashboard from '@/components/MobileDashboard'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/use-mobile'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (hasMounted && isMobile === false) {
      const checkRole = async () => {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          // Fallback to login if No User, though Middleware should handle it.
          router.push('/login')
          return
        }
        const email = user.email?.toLowerCase() || ''
        const isAdmin = email.includes('admin@')
        router.push(isAdmin ? '/dashboard' : '/checkin')
      }
      checkRole()
    }
  }, [hasMounted, isMobile, router])

  if (!hasMounted || isMobile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isMobile) {
    return <MobileDashboard />
  }

  return null // Will be redirected by useEffect
}
