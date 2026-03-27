'use client'

import MobileDashboard from '@/components/MobileDashboard'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/lib/use-mobile'
import { useEffect, useState } from 'react'

export default function Home() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (hasMounted && isMobile === false) {
      router.push('/checkin')
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
