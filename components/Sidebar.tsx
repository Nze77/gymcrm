'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  UserPlus,
  Clock,
  MessageSquare,
  CheckSquare,
  Sun,
  Moon,
  Menu,
  X,
  Dumbbell,
  Calendar,
  LogOut
} from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { supabase } from '@/lib/supabase'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Dumbbell },
  { label: 'Check In', href: '/checkin', icon: CheckSquare },
  { label: 'Attendance', href: '/attendance', icon: Calendar },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Add Member', href: '/add-member', icon: UserPlus },
  { label: 'Expiring', href: '/expiring', icon: Clock },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'checkin' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      document.body.classList.add('dark')
      setIsDark(true)
    }

    // Check user role
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const email = user.email?.toLowerCase() || ''
        setUserRole(email === 'checkin@gym.com' || email.startsWith('checkin@') ? 'checkin' : 'admin')
      }
      setLoading(false)
    }
    fetchUser()
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    if (!isDark) {
      document.body.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.body.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const toggleSidebar = () => setIsOpen(!isOpen)

  if (loading) return null

  // Define nav items for the current role
  const allowedNavItems = navItems.filter(item => {
    if (userRole === 'checkin') {
      return item.href === '/checkin'
    }
    return true
  })

  return (
    <>
      {/* Mobile Header - Hidden on Home page to allow MobileDashboard to show its own header */}
      <div className={cn(
        "lg:hidden fixed top-0 left-0 right-0 h-16 glass-sidebar flex items-center justify-between px-6 z-50 transition-opacity whitespace-nowrap overflow-hidden",
        (pathname === '/' || pathname === '/checkin') ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <div className="flex items-center gap-2">
          <Dumbbell className="text-accent w-6 h-6" />
          <span className="serif text-xl font-bold">Aim Fitness</span>
        </div>
        <button onClick={toggleSidebar} className="p-2">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar backdrop for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-filter-none z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "glass-sidebar fixed top-0 left-0 bottom-0 z-50 w-[228px] transition-transform lg:translate-x-0 p-6 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="hidden lg:flex items-center gap-2 mb-12">
          <Dumbbell className="text-accent w-8 h-8" />
          <span className="serif text-2xl font-bold">Aim Fitness</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {allowedNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-[var(--nav-active-bg)] border border-[var(--nav-active-border)] text-[var(--nav-active-color)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-[var(--divider)] flex flex-col gap-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between bg-[var(--input-bg)] p-1.5 rounded-2xl border border-[var(--input-border)]"
          >
            <div className={cn(
              "flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl flex-1 transition-all",
              !isDark ? "bg-white text-orange-600 shadow-sm" : "text-gray-500"
            )}>
              <Sun className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Light</span>
            </div>
            <div className={cn(
              "flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl flex-1 transition-all",
              isDark ? "bg-[var(--card-bg)] text-orange-400 shadow-sm border border-white/10" : "text-gray-500"
            )}>
              <Moon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Dark</span>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}
