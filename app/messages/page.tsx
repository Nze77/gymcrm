'use client'

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Search,
  Copy,
  CheckCircle2,
  Navigation,
  Loader2,
  Clock,
  ChevronRight,
  TrendingUp,
  UserCheck
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member, MessageLog } from '@/types'
import { getWelcomeMessage, getReminderMessage } from '@/utils/messageTemplates'
import { formatDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function MessagesPage() {
  const [activeTab, setActiveTab] = useState<'welcome' | 'reminder'>('welcome')
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([])
  const [search, setSearch] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: membersData } = await supabase.from('members').select('*')
    const { data: logsData } = await supabase.from('message_log').select('*')

    if (membersData) setMembers(membersData)
    if (logsData) setMessageLogs(logsData)
    setLoading(false)
  }

  const markAsSent = async (memberId: string, type: 'welcome' | 'reminder') => {
    const { data, error } = await supabase
      .from('message_log')
      .insert([{ member_id: memberId, message_type: type }])
      .select()
      .single()

    if (!error && data) {
      setMessageLogs(prev => [...prev, data])
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const isSent = (memberId: string, type: 'welcome' | 'reminder') => {
    return messageLogs.some(log => log.member_id === memberId && log.message_type === type)
  }

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const selectedMember = members.find(m => m.id === selectedMemberId)

  // Members needing reminders: expiring within 7 days and haven't received reminder
  const reminderMembers = members.filter(m => {
    const expiry = new Date(m.valid_till)
    const today = new Date()
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 7
  })

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <header>
          <h1 className="text-4xl font-bold mb-2">Message Center</h1>
          <p className="text-[var(--text-secondary)]">Automated communication helpers</p>
        </header>

        <section className="flex items-center gap-2 p-1.5 glass-card bg-orange-50/10 border-orange-200/5 hover:border-orange-200/20 shadow-xl shadow-black/5 rounded-3xl w-full max-w-sm">
          <button
            onClick={() => setActiveTab('welcome')}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'welcome'
                ? "bg-white text-orange-600 shadow-xl shadow-orange-500/10 border border-orange-200/50"
                : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
            )}
          >
            <Navigation className={cn("w-4 h-4", activeTab === 'welcome' ? "fill-orange-500/10" : "")} />
            WELCOME
          </button>
          <button
            onClick={() => setActiveTab('reminder')}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm transition-all duration-300",
              activeTab === 'reminder'
                ? "bg-white text-orange-600 shadow-xl shadow-orange-500/10 border border-orange-200/50"
                : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
            )}
          >
            <Clock className={cn("w-4 h-4", activeTab === 'reminder' ? "fill-orange-500/10" : "")} />
            REMINDER
          </button>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : activeTab === 'welcome' ? (
          <div className="flex flex-col md:flex-row gap-8 pb-20">
            {/* Search and Select */}
            <div className="md:w-1/3 flex flex-col gap-6">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-accent" />
                <input
                  type="text"
                  placeholder="Search member..."
                  className="!pl-10 h-14 glass-card shadow-xl shadow-black/5"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMemberId(member.id)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl text-left transition-all border animate-fadeUp",
                      selectedMemberId === member.id
                        ? "bg-white border-orange-200 shadow-lg shadow-orange-500/5"
                        : "bg-[var(--card-bg)] border-[var(--card-border)] hover:border-accent"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[var(--input-bg)] border border-[var(--input-border)]">
                        {member.profile_image_url ? (
                          <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-[var(--text-muted)]">
                            {member.full_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-sm truncate max-w-[120px]">{member.full_name}</span>
                    </div>
                    {isSent(member.id, 'welcome') && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Preview */}
            <div className="md:w-2/3">
              {selectedMember ? (
                <div className="glass-card p-10 flex flex-col gap-8 animate-scaleIn shadow-2xl shadow-black/5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -translate-y-16 translate-x-16" />

                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-3xl font-bold">Welcome Preview</h2>
                    {isSent(selectedMember.id, 'welcome') && (
                      <div className="badge badge-active py-2 px-4 gap-2 bg-green-100 text-green-700 border-green-200">
                        <UserCheck className="w-4 h-4" />
                        Already Welcome
                      </div>
                    )}
                  </div>

                  <div className="bg-[var(--input-bg)] p-8 rounded-3xl border border-[var(--input-border)] shadow-inner">
                    <pre className="whitespace-pre-wrap font-sans text-[var(--text-secondary)] text-lg leading-relaxed">
                      {getWelcomeMessage(selectedMember.full_name, formatDate(selectedMember.joined_at), formatDate(selectedMember.valid_till))}
                    </pre>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => copyToClipboard(getWelcomeMessage(selectedMember.full_name, formatDate(selectedMember.joined_at), formatDate(selectedMember.valid_till)), selectedMember.id)}
                      className="btn btn-accent flex-1 h-16 gap-3 shadow-xl shadow-orange-500/10 text-lg group"
                    >
                      {copiedId === selectedMember.id ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                      {copiedId === selectedMember.id ? 'Copied to Clipboard' : 'Copy Message'}
                    </button>
                    <button
                      onClick={() => markAsSent(selectedMember.id, 'welcome')}
                      disabled={isSent(selectedMember.id, 'welcome')}
                      className="btn btn-primary h-16 px-8 gap-3 shadow-xl disabled:opacity-50 group border border-black"
                    >
                      <Navigation className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      Mark as Sent
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-20 flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 bg-[var(--input-bg)] rounded-3xl flex items-center justify-center mb-8 shadow-sm">
                    <MessageSquare className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">No Member Selected</h3>
                  <p className="text-[var(--text-secondary)] max-w-xs">Select a member from the list to preview and send their welcome message.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-20">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-accent" />
              Required Reminders
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reminderMembers.length > 0 ? (
                reminderMembers.map((member) => (
                  <div
                    key={member.id}
                    className={cn(
                      "glass-card p-8 flex flex-col gap-6 animate-scaleIn shadow-2xl shadow-black/5 hover:-translate-y-2 transition-all duration-500",
                      isSent(member.id, 'reminder') ? "opacity-60 grayscale-[0.5]" : ""
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-3xl overflow-hidden bg-[var(--input-bg)] border border-[var(--input-border)]">
                          {member.profile_image_url ? (
                            <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-[var(--text-muted)]">
                              {member.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{member.full_name}</h3>
                          <p className="text-orange-600/60 font-bold uppercase text-[10px] tracking-widest mt-1">Expires {formatDate(member.valid_till)}</p>
                        </div>
                      </div>
                      {isSent(member.id, 'reminder') && (
                        <div className="w-10 h-10 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="bg-[var(--input-bg)] p-6 rounded-3xl border border-[var(--input-border)] italic text-[var(--text-secondary)] relative group">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed truncate group-hover:whitespace-pre-line group-hover:transition-all">
                        {getReminderMessage(member.full_name, formatDate(member.valid_till))}
                      </pre>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => copyToClipboard(getReminderMessage(member.full_name, formatDate(member.valid_till)), member.id)}
                        className="btn btn-accent flex-1 h-14 gap-3 shadow-lg shadow-orange-500/10 group overflow-hidden"
                      >
                        {copiedId === member.id ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                        <span className="font-bold">{copiedId === member.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => markAsSent(member.id, 'reminder')}
                        disabled={isSent(member.id, 'reminder')}
                        className="btn btn-primary h-14 px-6 gap-2 disabled:opacity-50 group border border-black shadow-lg"
                      >
                        <MessageSquare className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                        Sent
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-20 text-center glass-card">
                  <div className="w-20 h-20 bg-[var(--input-bg)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-10 h-10 text-[var(--text-muted)]" />
                  </div>
                  <p className="text-[var(--text-secondary)] text-xl font-bold mb-2">Maximum Efficiency.</p>
                  <p className="text-[var(--text-muted)]">No overdue reminders or upcoming expirations without notice.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
