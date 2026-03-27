'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  UserCheck,
  Loader2,
  CalendarDays
} from 'lucide-react'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  eachDayOfInterval,
  isAfter
} from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Member, Checkin } from '@/types'
import { formatDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function AttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(false)
  const [attendance, setAttendance] = useState<(Checkin & { member: Member })[]>([])

  useEffect(() => {
    fetchAttendanceForDate(selectedDate)
  }, [selectedDate])

  const fetchAttendanceForDate = async (date: Date) => {
    setLoading(true)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('checkins')
      .select('*, member:members(*)')
      .gte('checked_in_at', startOfDay.toISOString())
      .lte('checked_in_at', endOfDay.toISOString())
      .order('checked_in_at', { ascending: true })

    if (!error && data) {
      setAttendance(data as any)
    }
    setLoading(false)
  }

  const renderHeader = () => {
    return (
      <header>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2">Attendance</h1>
            <p className="text-[var(--text-secondary)]">Historical attendance logs and traffic analysis</p>
          </div>

          <div className="flex items-center gap-4 glass-card p-2 bg-white/5 border-white/5 shadow-xl">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-6 py-2 text-center min-w-[160px]">
              <span className="text-lg font-bold serif uppercase tracking-widest">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
            </div>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
    )
  }

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 mb-4">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em]">
            {day}
          </div>
        ))}
      </div>
    )
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate
    })

    const today = new Date()

    return (
      <div className="grid grid-cols-7 gap-1 md:gap-3">
        {calendarDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isToday = isSameDay(day, today)
          const isFuture = isAfter(day, today)

          return (
            <div
              key={i}
              onClick={() => !isFuture && setSelectedDate(day)}
              className={cn(
                "relative group aspect-square p-2 md:p-4 !rounded-lg border transition-all duration-300 flex flex-col !items-center md:items-start justify-center md:justify-start cursor-pointer",
                !isCurrentMonth ? "opacity-20 pointer-events-none" : "hover:scale-[1.02]",
                isFuture ? "opacity-30 cursor-default" : "",
                isSelected
                  ? "bg-white text-orange-600 border-orange-200 shadow-xl shadow-orange-500/10 z-10"
                  : "glass-card border-transparent bg-white/5 hover:border-white/10 shadow-sm",
                isToday && !isSelected ? "border-orange-500/30 ring-1 ring-orange-500/20" : ""
              )}
            >
              <span className={cn(
                "text-sm md:text-xl font-bold transition-transform group-hover:scale-110",
                isSelected ? "text-orange-600" : "text-[var(--text-primary)]",
                isToday ? "underline decoration-orange-500/50 decoration-2 underline-offset-4" : ""
              )}>
                {format(day, 'd')}
              </span>
              {isToday && <span className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-500 rounded-full md:block hidden" />}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        {renderHeader()}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Calendar View */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="glass-card p-6 md:p-8 shadow-2xl shadow-black/5 animate-scaleIn">
              {renderDays()}
              {renderCells()}
            </div>
          </div>

          {/* Date Details View */}
          <div className="lg:col-span-5">
            <div className="flex flex-col gap-6 sticky top-24">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-sm">
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">{format(selectedDate, 'do MMMM')}</h2>
                </div>
                {!loading && (
                  <div className="badge badge-generic py-2 px-4 gap-2 bg-white/5 border-white/10 text-[var(--text-muted)] text-[10px] font-bold tracking-widest uppercase">
                    {attendance.length} Total
                  </div>
                )}
              </div>

              <div className="glass-card p-6 md:p-8 min-h-[400px] flex flex-col gap-6 animate-scaleIn shadow-2xl shadow-black/5">
                {loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-accent" />
                    <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest">Gathering records...</p>
                  </div>
                ) : attendance.length > 0 ? (
                  <div className="flex flex-col gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {attendance.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all animate-fadeUp">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--input-bg)] shadow-sm">
                            {log.member.profile_image_url ? (
                              <img src={log.member.profile_image_url} alt={log.member.full_name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-[var(--text-muted)]">
                                {log.member.full_name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-sm tracking-tight">{log.member.full_name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-accent" />
                              <span className="text-[10px] font-bold text-accent uppercase tracking-tighter">
                                {new Date(log.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {log.checked_out_at ? (
                          <div className="text-right">
                            <span className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Out</span>
                            <span className="text-xs font-bold">{new Date(log.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 py-1 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            In
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-40">
                    <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                      <CalendarDays className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No Records</h3>
                    <p className="text-sm max-w-[200px] leading-relaxed">No member check-ins were registered on this date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
