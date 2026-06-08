'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Plus,
  Loader2,
  X,
  Phone,
  MapPin,
  User,
  Trash2,
  ClipboardList,
  Save,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Enquiry } from '@/types'
import { formatDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'

type OverlayMode = 'add' | 'edit' | null

export default function EnquiryPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(null)
  const [selected, setSelected] = useState<Enquiry | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isEntering, setIsEntering] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    fetchEnquiries()
  }, [])

  useEffect(() => {
    if (overlayMode) {
      setIsEntering(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setIsEntering(false)))
    }
  }, [overlayMode])

  const fetchEnquiries = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) setEnquiries(data as Enquiry[])
    setLoading(false)
  }

  const openAdd = () => {
    setName('')
    setPhone('')
    setLocation('')
    setSelected(null)
    setShowDeleteConfirm(false)
    setIsClosing(false)
    setOverlayMode('add')
  }

  const openEdit = (enquiry: Enquiry) => {
    setName(enquiry.name)
    setPhone(enquiry.phone)
    setLocation(enquiry.location)
    setSelected(enquiry)
    setShowDeleteConfirm(false)
    setIsClosing(false)
    setOverlayMode('edit')
  }

  const closeOverlay = () => {
    setIsClosing(true)
    setTimeout(() => {
      setOverlayMode(null)
      setSelected(null)
      setIsClosing(false)
      setShowDeleteConfirm(false)
    }, 280)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    if (overlayMode === 'add') {
      const { error } = await supabase
        .from('enquiries')
        .insert([{ name, phone, location }])

      if (!error) {
        closeOverlay()
        fetchEnquiries()
      }
    } else if (overlayMode === 'edit' && selected) {
      const { error } = await supabase
        .from('enquiries')
        .update({ name, phone, location })
        .eq('id', selected.id)

      if (!error) {
        closeOverlay()
        fetchEnquiries()
      }
    }

    setIsSaving(false)
  }

  const handleDelete = async () => {
    if (!selected) return
    setIsDeleting(true)

    const { error } = await supabase
      .from('enquiries')
      .delete()
      .eq('id', selected.id)

    if (!error) {
      setIsDeleting(false)
      closeOverlay()
      fetchEnquiries()
    } else {
      setIsDeleting(false)
    }
  }

  const animating = isClosing || isEntering

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10 pb-32">

        {/* Header */}
        <header>
          <h1 className="text-4xl font-bold mb-1">Enquiries</h1>
          <p className="text-[var(--text-secondary)]">Track and manage prospective member enquiries</p>
        </header>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <Loader2 className="w-10 h-10 animate-spin text-accent" />
          </div>
        ) : enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 glass-card text-center gap-4 opacity-50">
            <div className="w-16 h-16 rounded-3xl bg-[var(--input-bg)] flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-xl font-bold">No enquiries yet</h3>
            <p className="text-sm text-[var(--text-muted)]">Tap the + button below to add your first one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                onClick={() => openEdit(enquiry)}
                className="glass-card p-5 flex items-center gap-4 cursor-pointer hover:scale-[1.01] hover:border-accent/20 transition-all duration-200 animate-scaleIn"
              >
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-xl font-bold uppercase shrink-0">
                  {enquiry.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base truncate">{enquiry.name}</h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                      <Phone className="w-3 h-3" />
                      {enquiry.phone}
                    </span>
                    {enquiry.location && (
                      <span className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                        <MapPin className="w-3 h-3" />
                        {enquiry.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest shrink-0 text-right">
                  {formatDate(enquiry.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      <button
        onClick={openAdd}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-accent text-white shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 z-40"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Overlay */}
      {overlayMode && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6"
          style={{
            transition: 'opacity 280ms cubic-bezier(0.4,0,0.2,1)',
            opacity: animating ? 0 : 1,
          }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ background: 'rgba(0,0,0,0.18)' }}
            onClick={closeOverlay}
          />

          {/* Card */}
          <div
            className="relative glass-card !bg-[var(--modal-bg-dense)] w-full max-w-md p-8 shadow-2xl backdrop-blur-[10px]"
            style={{
              transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 280ms cubic-bezier(0.4,0,0.2,1)',
              transform: animating ? 'scale(0.92) translateY(20px)' : 'scale(1) translateY(0)',
              opacity: animating ? 0 : 1,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold">
                  {overlayMode === 'add' ? 'New Enquiry' : 'Edit Enquiry'}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                  {overlayMode === 'add' ? 'Record a prospective member' : 'Update or remove this enquiry'}
                </p>
              </div>
              <button
                onClick={closeOverlay}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--input-border)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Delete confirmation inline */}
            {showDeleteConfirm ? (
              <div className="flex flex-col gap-6 animate-fadeUp">
                <div className="flex flex-col items-center text-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="font-bold text-lg">Delete this enquiry?</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    <span className="font-bold text-[var(--text-primary)]">{selected?.name}</span> will be permanently removed.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-12 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] font-bold text-sm hover:border-accent/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-colors"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Delete</>}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                {/* Name */}
                <div>
                  <label className="label font-bold mb-2">Full Name</label>
                  <div className="relative group/field">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="text"
                      placeholder="e.g. Aryan Pawaskar"
                      className="!pl-10 h-13"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="label font-bold mb-2">Phone Number</label>
                  <div className="relative group/field">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      className="!pl-10 h-13"
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      pattern="\d{10}"
                      minLength={10}
                      maxLength={10}
                      required
                      onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Phone number must be exactly 10 digits')}
                      onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="label font-bold mb-2">Location / Area</label>
                  <div className="relative group/field">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="text"
                      placeholder="e.g. Manpada"
                      className="!pl-10 h-13"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className={`flex gap-3 pt-2 ${overlayMode === 'edit' ? '' : ''}`}>
                  {overlayMode === 'edit' && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-13 px-4 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2 font-bold text-sm shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-13 rounded-2xl bg-accent hover:bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                  >
                    {isSaving
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Save className="w-4 h-4" /> {overlayMode === 'add' ? 'Save Enquiry' : 'Save Changes'}</>
                    }
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </DashboardLayout>
  )
}
