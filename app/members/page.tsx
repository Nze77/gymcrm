'use client'

import React, { useState, useEffect } from 'react'
import { Search, Loader2, UserPlus, SlidersHorizontal, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import MemberCard from '@/components/MemberCard'
import Link from 'next/link'

export default function MembersListPage() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('full_name', { ascending: true })

    if (!error && data) {
      setMembers(data)
    }
    setLoading(false)
  }

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  )

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Member Directory</h1>
            <p className="text-[var(--text-secondary)]">Manage your gym member community</p>
          </div>
          <Link
            href="/add-member"
            className="btn btn-accent flex items-center gap-3 h-14 shadow-xl shadow-orange-500/10 group px-6 border border-orange-400/20"
          >
            <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="font-bold">Add New Member</span>
          </Link>
        </header>

        <section className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative group flex-1">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-accent transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Filter by name or phone..."
              className="w-full h-16 !pl-14 pr-8 text-lg glass-card border-2 border-transparent focus:border-accent shadow-xl shadow-black/5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-secondary h-16 w-full md:w-auto px-8 gap-3">
            <SlidersHorizontal className="w-5 h-5" />
            Advanced Filtering
          </button>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => (
                <div key={member.id} className="animate-scaleIn">
                  <MemberCard member={member} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center glass-card">
                <div className="w-20 h-20 bg-[var(--input-bg)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-10 h-10 text-[var(--text-muted)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-xl mb-4 font-bold">No members found.</p>
                <p className="text-[var(--text-muted)] mb-8">Try adjusting your search criteria or add a new member.</p>
                <Link href="/add-member" className="btn btn-primary gap-3 mx-auto shadow-black/5">
                  <UserPlus className="w-5 h-5" />
                  Add New Member
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
