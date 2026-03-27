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
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    newMembers: 0,
    recentCheckins: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Fetch total members
      const { count: total, error: totalErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })

      // Fetch active members (example: status = 'active')
      const { count: active, error: activeErr } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Fetch recent checkins (last 24h)
      const yesterday = new Date()
      yesterday.setHours(yesterday.getHours() - 24)
      const { count: recent, error: recentErr } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())

      setStats({
        totalMembers: total || 0,
        activeMembers: active || 0,
        newMembers: 0, // Could fetch members created in last 7 days
        recentCheckins: recent || 0
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
                  <h2 className="text-2xl font-bold">Recent Activity</h2>
                  <button className="text-accent text-sm font-bold hover:underline">View All</button>
                </div>
                <div className="flex flex-col gap-6">
                   <p className="text-[var(--text-muted)] italic">No recent activities to display.</p>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
