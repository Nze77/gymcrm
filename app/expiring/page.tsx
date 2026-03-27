'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Loader2, Users, Hourglass, SlidersHorizontal, ArrowUpRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member } from '@/types'
import { formatDate, getExpiryWindow } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

export default function ExpiringSoonPage() {
  const [window, setWindow] = useState('7') // Default 1 week
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExpiringMembers()
  }, [window])

  const fetchExpiringMembers = async () => {
    setLoading(true)
    const { start, end } = getExpiryWindow(parseInt(window))
    
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .gte('valid_till', start.toISOString().split('T')[0])
      .lte('valid_till', end.toISOString().split('T')[0])
      .order('valid_till', { ascending: true })

    if (!error && data) {
      setMembers(data)
    }
    setLoading(false)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Expiring Soon</h1>
            <p className="text-[var(--text-secondary)]">Proactive membership renewal monitoring</p>
          </div>
          
          <div className="flex items-center gap-4 glass-card p-2 rounded-2xl">
            <div className="px-4 label mb-0 flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-accent" />
              <span>Horizon</span>
            </div>
            <select 
              value={window} 
              onChange={(e) => setWindow(e.target.value)}
              className="w-40 border-none bg-transparent focus:ring-0 h-10 p-0 pr-8 text-sm font-bold uppercase transition-all"
            >
              <option value="2">2 Days</option>
              <option value="7">1 Week</option>
              <option value="30">1 Month</option>
            </select>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {members.map((member) => (
              <Link 
                key={member.id} 
                href={`/members/${member.id}`}
                className="glass-card p-6 flex flex-col gap-4 group transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 animate-scaleIn"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[var(--input-bg)] border border-[var(--input-border)]">
                      {member.profile_image_url ? (
                        <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[var(--text-muted)]">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{member.full_name}</h3>
                      <p className="text-[var(--text-muted)] text-sm">{member.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-accent group-hover:text-white transition-all transform opacity-0 group-hover:opacity-100">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--divider)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-orange-600/60" />
                    <span className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">Expires {formatDate(member.valid_till)}</span>
                  </div>
                  <div className="badge badge-inactive">
                    In {Math.ceil((new Date(member.valid_till).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="col-span-full py-20 text-center glass-card">
            <div className="w-20 h-20 bg-[var(--input-bg)] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-[var(--text-secondary)] text-xl font-bold mb-2">Clear horizon.</p>
            <p className="text-[var(--text-muted)]">No memberships expiring within the next {window === '2' ? '2 days' : window === '7' ? '7 days' : '30 days'}.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
