'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Loader2, UserPlus, Fingerprint, Lock, Users, LogOut, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member, Checkin } from '@/types'
import { isMemberActive, formatDate } from '@/utils/dateHelpers'
import { isTooShortVisit, startOfTodayISO } from '@/utils/attendance'
import DashboardLayout from '@/components/DashboardLayout'
import StatusBadge from '@/components/StatusBadge'

const errorMessage = (err: unknown) =>
  (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message) || 'network error'

export default function CheckinPage() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  // Per-member open check-in for today. A missing key means the status is still
  // loading, so no action button is offered until we actually know it.
  const [activeCheckins, setActiveCheckins] = useState<Record<string, Checkin | null>>({})
  const [statusFailed, setStatusFailed] = useState<Record<string, boolean>>({})
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const [notice, setNotice] = useState<{ type: 'error' | 'info'; text: string } | null>(null)
  const [liveMembers, setLiveMembers] = useState<any[]>([])
  const [selectedLiveId, setSelectedLiveId] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const overlayCardRef = useRef<HTMLDivElement>(null)

  // Synchronous guard against repeated taps: a state update lands a render too
  // late to stop a second tap that arrives while the first request is in flight.
  const inFlight = useRef<Set<string>>(new Set())
  // Bumped on every status lookup and every check-in/out, so a lookup that
  // started earlier can't overwrite a newer result when it finally returns.
  const statusVersion = useRef<Record<string, number>>({})
  const searchVersion = useRef(0)

  useEffect(() => {
    fetchLiveOccupancy()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) {
        searchMembers()
      } else {
        setMembers([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [search])

  const fetchLiveOccupancy = async () => {
    const { data } = await supabase
      .from('checkins')
      .select('*, member:members(*)')
      .is('checked_out_at', null)
      .gte('checked_in_at', startOfTodayISO())

    if (data) {
      setLiveMembers(data.map(d => ({ ...d.member, checkin_id: d.id, checkin_time: d.checked_in_at })))
    }
  }

  const bumpStatusVersion = (memberId: string) => {
    const next = (statusVersion.current[memberId] ?? 0) + 1
    statusVersion.current[memberId] = next
    return next
  }

  const setMemberStatus = (memberId: string, checkin: Checkin | null) => {
    bumpStatusVersion(memberId)
    setActiveCheckins(prev => ({ ...prev, [memberId]: checkin }))
    setStatusFailed(prev => ({ ...prev, [memberId]: false }))
  }

  const getOpenCheckin = (memberId: string) =>
    supabase
      .from('checkins')
      .select('*')
      .eq('member_id', memberId)
      .is('checked_out_at', null)
      .gte('checked_in_at', startOfTodayISO())
      .order('checked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle<Checkin>()

  const searchMembers = async () => {
    const version = ++searchVersion.current
    setLoading(true)
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .ilike('full_name', `%${search}%`)
      .limit(10)

    // A newer search has started since; its results win.
    if (version !== searchVersion.current) return

    if (!error && data) {
      // Drop cached statuses for these members so one from an earlier search
      // (possibly changed on another device since) is never shown as current.
      setActiveCheckins(prev => {
        const next = { ...prev }
        data.forEach(m => { if (!inFlight.current.has(m.id)) delete next[m.id] })
        return next
      })
      setMembers(data)
      data.forEach(m => { if (!inFlight.current.has(m.id)) fetchActiveCheckin(m.id) })
    }
    setLoading(false)
  }

  const fetchActiveCheckin = async (memberId: string) => {
    const version = bumpStatusVersion(memberId)
    setStatusFailed(prev => ({ ...prev, [memberId]: false }))
    const { data, error } = await getOpenCheckin(memberId)

    if (statusVersion.current[memberId] !== version) return

    if (error) {
      setStatusFailed(prev => ({ ...prev, [memberId]: true }))
      return
    }
    setActiveCheckins(prev => ({ ...prev, [memberId]: data ?? null }))
  }

  const beginAction = (memberId: string) => {
    if (inFlight.current.has(memberId)) return false
    inFlight.current.add(memberId)
    bumpStatusVersion(memberId)
    setPending(prev => ({ ...prev, [memberId]: true }))
    setNotice(null)
    return true
  }

  const endAction = (memberId: string) => {
    inFlight.current.delete(memberId)
    setPending(prev => ({ ...prev, [memberId]: false }))
  }

  const handleCheckIn = async (memberId: string) => {
    if (!beginAction(memberId)) return
    try {
      // Ask the database, not the screen: the member may already be checked in
      // from another device, or by an earlier tap whose reply never arrived.
      const existing = await getOpenCheckin(memberId)
      if (existing.error) throw existing.error
      if (existing.data) {
        setMemberStatus(memberId, existing.data)
        setNotice({
          type: 'info',
          text: `Already checked in at ${new Date(existing.data.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
        })
        return
      }

      const { data, error } = await supabase
        .from('checkins')
        .insert([{ member_id: memberId }])
        .select()
        .single<Checkin>()
      if (error) throw error
      setMemberStatus(memberId, data)
    } catch (err: unknown) {
      setNotice({ type: 'error', text: `Check-in failed: ${errorMessage(err)}` })
      // The insert may have gone through even though the reply was lost.
      fetchActiveCheckin(memberId)
    } finally {
      endAction(memberId)
      fetchLiveOccupancy()
    }
  }

  // Visits shorter than MIN_VISIT_MINUTES are discarded instead of recorded.
  // Both statements only touch a check-in that is still open, so a repeated or
  // stale check-out can't delete or re-stamp a visit that was already closed.
  const closeCheckin = async (checkinId: string, checkedInAt: string) => {
    const now = new Date()
    if (isTooShortVisit(checkedInAt, now)) {
      return supabase.from('checkins').delete().eq('id', checkinId).is('checked_out_at', null)
    }
    return supabase
      .from('checkins')
      .update({ checked_out_at: now.toISOString() })
      .eq('id', checkinId)
      .is('checked_out_at', null)
  }

  const handleCheckOut = async (memberId: string) => {
    const activeCheckin = activeCheckins[memberId]
    if (!activeCheckin || !beginAction(memberId)) return

    try {
      const { error } = await closeCheckin(activeCheckin.id, activeCheckin.checked_in_at)
      if (error) throw error
      setMemberStatus(memberId, null)
    } catch (err: unknown) {
      setNotice({ type: 'error', text: `Check-out failed: ${errorMessage(err)}` })
      fetchActiveCheckin(memberId)
    } finally {
      endAction(memberId)
      fetchLiveOccupancy()
    }
  }

  useEffect(() => {
    if (selectedLiveId) {
      setIsEntering(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setIsEntering(false)))
    }
  }, [selectedLiveId])

  const closeOverlay = () => {
    setIsClosing(true)
    setTimeout(() => {
      setSelectedLiveId(null)
      setIsClosing(false)
    }, 280)
  }

  const handleLiveCheckOut = async (checkinId: string, checkedInAt: string, memberId: string) => {
    if (!beginAction(memberId)) return

    try {
      const { error } = await closeCheckin(checkinId, checkedInAt)
      if (error) throw error
    } catch (err: unknown) {
      setNotice({ type: 'error', text: `Check-out failed: ${errorMessage(err)}` })
      endAction(memberId)
      return
    }

    setIsClosing(true)
    setTimeout(() => {
      setSelectedLiveId(null)
      setIsClosing(false)
      endAction(memberId)
      // Re-read rather than assume: the member may still have another open check-in.
      fetchActiveCheckin(memberId)
      fetchLiveOccupancy()
    }, 280)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">

        {/* Header */}
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-1">Check-in Terminal</h1>
            <p className="text-[var(--text-secondary)]">Manage daily member attendance</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-3 rounded-2xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/5 bg-white/50 dark:bg-black/20"
            title="Sign Out of Terminal"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Search */}
        <section className="relative group">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-accent transition-colors">
            <Search className="w-6 h-6" />
          </div>
          <input
            type="text"
            placeholder="Search member by name..."
            className="w-full h-20 !pl-14 pr-8 text-xl glass-card border-2 border-transparent focus:border-accent shadow-2xl shadow-black/5"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          )}
        </section>

        {notice && (
          <div
            className={
              notice.type === 'error'
                ? "flex items-center justify-between gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm"
                : "flex items-center justify-between gap-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 font-bold text-sm"
            }
          >
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="shrink-0" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {members.length > 0 ? (
            members.map((member) => {
              const active = isMemberActive(member.valid_till)
              const currentCheckin = activeCheckins[member.id]
              const isPending = !!pending[member.id]

              return (
                <div key={member.id} className="glass-card p-6 flex flex-col gap-6 animate-scaleIn shadow-xl shadow-black/5">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--input-bg)] border border-[var(--input-border)]">
                      {member.profile_image_url ? (
                        <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--text-muted)]">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold">{member.full_name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusBadge isActive={active} />
                        <span className="text-[var(--text-muted)] text-sm">
                          {active ? `Expires ${formatDate(member.valid_till)}` : `Expired ${formatDate(member.valid_till)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {isPending ? (
                      <button disabled className="btn btn-secondary flex-1 h-14 text-sm gap-3 opacity-70 cursor-wait">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving…
                      </button>
                    ) : statusFailed[member.id] ? (
                      <button
                        onClick={() => fetchActiveCheckin(member.id)}
                        className="btn btn-secondary flex-1 h-14 text-sm gap-3"
                      >
                        Couldn&apos;t load status · Retry
                      </button>
                    ) : currentCheckin === undefined ? (
                      <button disabled className="btn btn-secondary flex-1 h-14 text-sm gap-3 opacity-70 cursor-wait">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Checking…
                      </button>
                    ) : !currentCheckin ? (
                      <button
                        onClick={() => handleCheckIn(member.id)}
                        disabled={!active}
                        className="btn btn-primary flex-1 h-14 text-sm gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <Fingerprint className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Check In
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckOut(member.id)}
                        className="btn btn-danger flex-1 h-14 text-sm gap-3 group"
                      >
                        <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Check Out
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : search && !loading ? (
            <div className="col-span-full py-12 text-center glass-card">
              <p className="text-[var(--text-secondary)] text-lg mb-4">No members found with that name.</p>
              <button className="btn btn-secondary gap-2 mx-auto">
                <UserPlus className="w-5 h-5" />
                Add New Member
              </button>
            </div>
          ) : null}
        </div>

        {/* Live Occupancy */}
        <section className="flex flex-col gap-6 pb-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold">{liveMembers.length} People in right now</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {liveMembers.length > 0 ? (
              liveMembers.map((member) => (
                <div
                  key={member.checkin_id}
                  onClick={() => { setSelectedLiveId(member.checkin_id); setIsClosing(false) }}
                  className="glass-card p-4 flex flex-col items-center text-center animate-scaleIn border-green-500/10 hover:border-green-500/30 hover:scale-105 transition-all duration-200 cursor-pointer group"
                >
                  <div className="relative w-16 h-16 mb-3">
                    <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--input-bg)]">
                      {member.profile_image_url ? (
                        <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[var(--text-muted)] uppercase">
                          {member.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
                  </div>
                  <span className="text-xs font-bold truncate w-full">{member.full_name.split(' ')[0]}</span>
                  <span className="text-[10px] text-green-600 font-bold mt-1 opacity-60">
                    {new Date(member.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 glass-card text-center border-dashed border-2">
                <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Gym is currently empty</p>
              </div>
            )}
          </div>
        </section>

      </div>

      {selectedLiveId && typeof document !== 'undefined' && (() => {
        const member = liveMembers.find(m => m.checkin_id === selectedLiveId)
        if (!member) return null
        return createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
              transition: 'opacity 280ms cubic-bezier(0.4,0,0.2,1)',
              opacity: isClosing || isEntering ? 0 : 1,
            }}
          >
            {/* Backdrop — subtle blur, no heavy tint */}
            <div
              className="absolute inset-0 backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,0.18)' }}
              onClick={closeOverlay}
            />

            {/* Card */}
            <div
              ref={overlayCardRef}
              className="relative glass-card flex flex-col items-center text-center p-10 w-full max-w-sm shadow-2xl"
              style={{
                transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 280ms cubic-bezier(0.4,0,0.2,1)',
                transform: isClosing || isEntering ? 'scale(0.82) translateY(16px)' : 'scale(1) translateY(0)',
                opacity: isClosing || isEntering ? 0 : 1,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={closeOverlay}
                className="absolute top-4 left-4 w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--input-border)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Avatar */}
              <div className="relative w-28 h-28 mb-5 mt-2">
                <div className="w-full h-full rounded-3xl overflow-hidden bg-[var(--input-bg)] border-2 border-green-500/20 shadow-xl shadow-green-500/10">
                  {member.profile_image_url ? (
                    <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-[var(--text-muted)] uppercase">
                      {member.full_name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full animate-pulse shadow-md" />
              </div>

              {/* Info */}
              <h3 className="text-2xl font-bold mb-1">{member.full_name}</h3>
              <p className="text-sm text-[var(--text-muted)] mb-1">Currently in gym</p>
              <p className="text-sm font-bold text-green-600 mb-8">
                Since {new Date(member.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>

              {/* Checkout button */}
              <button
                onClick={() => handleLiveCheckOut(member.checkin_id, member.checkin_time, member.id)}
                disabled={!!pending[member.id]}
                className="w-full h-14 flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 active:scale-95 text-white font-bold text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-red-500/30 transition-all duration-150 disabled:opacity-60 disabled:cursor-wait"
              >
                {pending[member.id] ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                Check Out
              </button>
            </div>
          </div>,
          document.body
        )
      })()}

    </DashboardLayout>
  )
}