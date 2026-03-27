'use client'

import React from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Clock, MessageSquare, CheckSquare, Calendar, Dumbbell
} from 'lucide-react'

const navItems = [
  { label: 'Check In', href: '/checkin', icon: CheckSquare, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Attendance', href: '/attendance', icon: Calendar, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Members', href: '/members', icon: Users, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Add Member', href: '/add-member', icon: UserPlus, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Expiring', href: '/expiring', icon: Clock, color: 'bg-orange-500/10 text-orange-500' },
  { label: 'Messages', href: '/messages', icon: MessageSquare, color: 'bg-orange-500/10 text-amber-500' },
]

export default function MobileDashboard() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[100dvh] px-6 py-12 animate-fadeUp overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center gap-12">
        <header className="text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-14 h-14 bg-accent rounded-[22px] flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Dumbbell className="text-white w-7 h-7" />
            </div>
          </div>
          <h1 className="serif text-4xl font-bold tracking-[0.05em] mb-2">AM Fitness</h1>
          <p className="text-[var(--text-secondary)] font-medium opacity-70 serif italic uppercase tracking-[0.2em] text-[10px]">
            Gym Management System
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 w-full">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="glass-card flex flex-col items-center justify-center p-5 aspect-square gap-3 transition-all active:scale-95 hover:shadow-2xl border-white/40 group bg-white/40"
            >
              <div className={`p-4 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon className="w-7 h-7" />
              </div>
              <span className="font-bold text-[17px] text-[var(--text-primary)] tracking-tight">
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-[0.25em] uppercase opacity-50 select-none">
          Powered by AM Fitness CRM
        </p>
      </div>
    </div>
  )
}