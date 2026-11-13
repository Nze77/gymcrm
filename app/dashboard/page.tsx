'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Calendar, 
  MessageSquare,
  Clock,
  ArrowUpRight,
  Loader2,
  LogIn,
  AlertTriangle
} from 'lucide-react'
import { startOfDay, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { Checkin, Member } from '@/types'
import { formatInputDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

type YesterdayCheckin = Checkin & {
  member: Pick<Member, 'id' | 'full_name' | 'profile_image_url'> | null
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    recentCheckins: 0
  })
  const [yesterdayCheckins, setYesterdayCheckins] = useState<YesterdayCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const yesterday = new Date()
      yesterday.setHours(yesterday.getHours() - 24)

      const todayStart = startOfDay(new Date())
      const yesterdayStart = subDays(todayStart, 1)

      // Parallelize fetches for better performance
      const [totalRes, activeRes, recentRes, yesterdayRes] = await Promise.all([
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .gte('valid_till', formatInputDate(new Date())),
        supabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .gte('checked_in_at', yesterday.toISOString()),
        supabase
          .from('checkins')
          .select('*, member:members(id, full_name, profile_image_url)')
          .gte('checked_in_at', yesterdayStart.toISOString())
          .lt('checked_in_at', todayStart.toISOString())
          .order('checked_in_at', { ascending: true })
      ])

      setYesterdayCheckins((yesterdayRes.data as YesterdayCheckin[] | null) || [])

      setStats({
        totalMembers: totalRes.count || 0,
        activeMembers: activeRes.count || 0,
        newMembers: 0,
        recentCheckins: recentRes.count || 0
      })
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Members', value: stats.totalMembers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Active Members', value: stats.activeMembers, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Recent Check-ins', value: stats.recentCheckins, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Pending Messages', value: 0, icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ]

  // Every check-in from yesterday that was never closed is a missed check-out,
  // since yesterday's calendar day is already over.
  const yesterdayNoCheckouts = yesterdayCheckins.filter(c => !c.checked_out_at)
  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-8 pb-10">
        <header>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Overview of your gym's performance.</p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, i) => (
                <div key={i} className="glass-card p-6 flex flex-col gap-4 hover:border-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className={`${card.bg} p-3 rounded-2xl`}>
                      <card.icon className={`w-6 h-6 ${card.color}`} />
                    </div>
                    <div className="flex items-center gap-1 text-green-500 text-sm font-bold">
                      <ArrowUpRight className="w-4 h-4" />
                      <span>+12%</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[var(--text-secondary)] text-sm font-medium mb-1">{card.label}</h3>
                    <p className="text-3xl font-bold">{card.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Link href="/add-member" className="btn btn-secondary h-24 flex-col gap-2 rounded-3xl group">
                    <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Add Member</span>
                  </Link>
                  <Link href="/members" className="btn btn-secondary h-24 flex-col gap-2 rounded-3xl group">
                    <Users className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">View Members</span>
                  </Link>
                  <Link href="/checkin" className="btn btn-secondary h-24 flex-col gap-2 rounded-3xl group">
                    <Clock className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Manual Check-in</span>
                  </Link>
                  <Link href="/messages" className="btn btn-secondary h-24 flex-col gap-2 rounded-3xl group">
                    <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Send Messages</span>
                  </Link>
                </div>
              </section>

              <section className="glass-card p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold">Recent Activity</h2>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Yesterday</p>
                  </div>
                  <Link href="/attendance" className="text-accent text-sm font-bold hover:underline">View All</Link>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-2xl p-4 bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <LogIn className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Check-ins</span>
                    </div>
                    <p className="text-3xl font-bold">{yesterdayCheckins.length}</p>
                  </div>
                  <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Check-outs</span>
                    </div>
                    <p className="text-3xl font-bold">{yesterdayNoCheckouts.length}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {yesterdayCheckins.length === 0 ? (
                    <p className="text-[var(--text-muted)] italic">No check-ins yesterday.</p>
                  ) : (
                    yesterdayCheckins.map(log => {
                      const name = log.member?.full_name ?? 'Unknown member'
                      const row = (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-[var(--input-bg)]">
                              {log.member?.profile_image_url ? (
                                <img src={log.member.profile_image_url} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-[var(--text-muted)]">
                                  {name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm truncate">{name}</p>
                              <p className="text-xs text-[var(--text-muted)]">
                                In {formatTime(log.checked_in_at)}
                                {log.checked_out_at && <> · Out {formatTime(log.checked_out_at)}</>}
                              </p>
                            </div>
                          </div>
                          {!log.checked_out_at && (
                            <span className="shrink-0 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest">
                              No Check-out
                            </span>
                          )}
                        </>
                      )
                      const className = "flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--input-border)]"
                      return log.member ? (
                        <Link key={log.id} href={`/members/${log.member.id}`} className={`${className} hover:border-accent/40 transition-colors`}>
                          {row}
                        </Link>
                      ) : (
                        <div key={log.id} className={className}>{row}</div>
                      )
                    })
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
