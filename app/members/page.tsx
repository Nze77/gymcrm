'use client'

import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { Search, Loader2, UserPlus, SlidersHorizontal, Users, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member } from '@/types'
import DashboardLayout from '@/components/DashboardLayout'
import MemberCard from '@/components/MemberCard'
import Link from 'next/link'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const FILTER_LABELS: Record<'all' | 'active' | 'inactive', string> = {
  all: 'All',
  active: 'Active',
  inactive: 'Inactive',
}

export default function MembersListPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Required for createPortal in Next.js (document is not available on server)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const timer = setTimeout(fetchMembers, 300)
    return () => clearTimeout(timer)
  }, [search, statusFilter])

  const fetchMembers = async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('members')
        .select('*')
        .order('full_name', { ascending: true })

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
      }

      if (statusFilter === 'active') {
        query = query.eq('is_active', true)
      } else if (statusFilter === 'inactive') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query
      if (error) throw error

      setMembers(data || [])
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const isFiltered = statusFilter !== 'all'

  // Portalled modal — renders directly on document.body,
  // escaping the overflow-x: hidden stacking context in DashboardLayout
  const filterModal = mounted && isFilterModalOpen
    ? ReactDOM.createPortal(
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsFilterModalOpen(false)}
        />

        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <div className="bg-[var(--modal-bg-dense)] w-full max-w-[500px] p-8 shadow-2xl rounded-2xl pointer-events-auto">

            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Filter Members</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--input-bg)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {(['all', 'active', 'inactive'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter)
                    setIsFilterModalOpen(false)
                  }}
                  className={cn(
                    "h-14 rounded-xl px-6 text-left font-bold border transition-colors",
                    statusFilter === filter
                      ? "bg-accent text-white border-accent"
                      : "bg-[var(--input-bg)] border-[var(--input-border)] hover:border-accent/50"
                  )}
                >
                  {FILTER_LABELS[filter]}
                </button>
              ))}
            </div>

            {isFiltered && (
              <button
                onClick={() => {
                  setStatusFilter('all')
                  setIsFilterModalOpen(false)
                }}
                className="w-full h-14 mt-6 border border-[var(--input-border)] rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Clear Filter
              </button>
            )}

          </div>
        </div>
      </>,
      document.body
    )
    : null

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Member Directory</h1>
            <p className="text-[var(--text-secondary)]">
              Manage your gym member community
            </p>
          </div>

          <Link
            href="/add-member"
            className="btn btn-accent flex items-center gap-3 h-14 px-6 shadow-xl border border-orange-400/20"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-bold">Add Member</span>
          </Link>
        </header>

        {/* Search + Filters */}
        <section className="flex flex-col md:flex-row gap-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
            <input
              type="text"
              placeholder="Search name or phone..."
              className="w-full h-16 !pl-14 pr-6 text-lg glass-card border border-[var(--input-border)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={cn(
              "flex items-center justify-center h-16 px-8 gap-3 font-bold uppercase tracking-widest rounded-2xl shadow-xl border transition-colors",
              isFiltered
                ? "bg-accent text-white border-accent"
                : "bg-white text-[var(--text-primary)] border-[var(--input-border)]"
            )}
          >
            <SlidersHorizontal className={cn("w-5 h-5", isFiltered ? "text-white" : "text-accent")} />
            <span className="text-sm">
              {isFiltered ? FILTER_LABELS[statusFilter] : 'Filters'}
            </span>
            {isFiltered && <span className="w-2 h-2 rounded-full bg-white opacity-80" />}
          </button>
        </section>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <p className="text-red-500 font-bold mb-2">Error loading members</p>
            <p className="text-[var(--text-muted)] mb-6">{error}</p>
            <button onClick={fetchMembers} className="btn btn-secondary">Retry</button>
          </div>
        ) : members.length === 0 ? (
          <div className="glass-card text-center py-20">
            <Users className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" />
            <p className="text-xl font-bold mb-2">No members found</p>
            {isFiltered && (
              <p className="text-[var(--text-muted)] mb-4">
                Showing <span className="font-semibold">{FILTER_LABELS[statusFilter]}</span> members only
              </p>
            )}
            <Link href="/add-member" className="btn btn-primary mt-6">Add Member</Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] -mt-4">
              {members.length} {members.length === 1 ? 'member' : 'members'}
              {isFiltered && (
                <span> · <span className="text-accent font-semibold">{FILTER_LABELS[statusFilter]}</span></span>
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </>
        )}

      </div>

      {/* Modal rendered via portal — outside the overflow-x: hidden stacking context */}
      {filterModal}

    </DashboardLayout>
  )
}