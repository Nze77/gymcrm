'use client'

import React from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  Clock,
  MessageSquare,
  CheckSquare,
  Calendar,
  Dumbbell
} from 'lucide-react'

const navItems = [
  { label: 'Check In', href: '/checkin', icon: CheckSquare, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Attendance', href: '/attendance', icon: Calendar, color: 'bg-blue-500/10 text-blue-500' },
  { label: 'Members', href: '/members', icon: Users, color: 'bg-emerald-500/10 text-emerald-500' },
  { label: 'Add Member', href: '/add-member', icon: UserPlus, color: 'bg-purple-500/10 text-purple-500' },
  { label: 'Expiring', href: '/expiring', icon: Clock, color: 'bg-rose-500/10 text-rose-500' },
  { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'bg-amber-500/10 text-amber-500' },
]

export default function MobileDashboard() {
  return (
    <div className="flex flex-col min-h-screen p-6 pt-20 animate-fadeUp">
      <header className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Dumbbell className="text-accent w-10 h-10" />
          <h1 className="serif text-4xl font-bold tracking-tight">AM Fitness</h1>
        </div>
        <p className="text-[var(--text-secondary)] font-medium opacity-80 decoration-orange-500/30">
          Gym Management System
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card flex flex-col items-center justify-center p-6 gap-3 transition-all active:scale-95 hover:shadow-lg border-white/40"
          >
            <div className={`p-4 rounded-2xl ${item.color}`}>
              <item.icon className="w-8 h-8" />
            </div>
            <span className="font-semibold text-[15px] text-[var(--text-primary)]">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-12 py-6 text-center border-t border-[var(--divider)]">
        <p className="text-xs text-[var(--text-muted)] font-medium tracking-widest uppercase">
          Powered by AM Fitness CRM
        </p>
      </footer>
    </div>
  )
}
