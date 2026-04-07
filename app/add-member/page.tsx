'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Camera,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/utils/compressImage'
import { formatInputDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'

export default function AddMemberPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form State
  const [fullName, setFullName] = useState('')
  const [idNo, setIdNo] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [joinedAt, setJoinedAt] = useState(formatInputDate(new Date()))
  const [validTill, setValidTill] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let profileImageUrl = null

      if (image) {
        const compressed = await compressImage(image)
        const fileName = `${Date.now()}-${fullName.replace(/\s+/g, '-').toLowerCase()}.jpg`
        const { data, error: uploadError } = await supabase.storage
          .from('member-photos')
          .upload(fileName, compressed)

        if (uploadError) throw uploadError

        if (data) {
          const { data: { publicUrl } } = supabase.storage
            .from('member-photos')
            .getPublicUrl(fileName)
          profileImageUrl = publicUrl
        }
      }

      const { data: newMember, error: insertError } = await supabase
        .from('members')
        .insert([{
          full_name: fullName,
          id_no: idNo || null,
          phone,
          email,
          joined_at: joinedAt,
          valid_till: validTill,
          amount_paid: parseFloat(amountPaid) || 0,
          receipt_number: receiptNumber,
          profile_image_url: profileImageUrl,
          is_active: new Date(validTill) >= new Date()
        }])
        .select()
        .single()

      if (insertError) throw insertError

      if (newMember) {
        router.push(`/members/${newMember.id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add member')
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <header>
          <h1 className="text-4xl font-bold mb-2">Registration</h1>
          <p className="text-[var(--text-secondary)]">Enroll a new member into the gym community</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-10 pb-20">
          {/* Profile Photo Upload */}
          <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="glass-card p-8 flex flex-col items-center text-center">
              <label className="label mb-6 w-full text-center">Profile Photograph</label>
              <div className="relative group/photo w-48 h-48 rounded-3xl bg-[var(--input-bg)] border-2 border-dashed border-[var(--input-border)] hover:border-accent flex items-center justify-center transition-all cursor-pointer overflow-hidden shadow-inner">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-accent shadow-sm">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Click to upload</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[var(--text-muted)] text-xs mt-6 leading-relaxed">
                Images are compressed automatically.<br />Supported: JPG, PNG, WEBP.
              </p>
            </div>
          </div>

          {/* Member Details Form */}
          <div className="lg:w-2/3 glass-card p-8 md:p-10 space-y-8 animate-scaleIn shadow-2xl shadow-black/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="col-span-full md:col-span-1">
                <label className="label">Full Name </label>
                <div className="relative group/field">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="Aryan"
                    className="!pl-10 h-14"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">ID no.</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    className="!pl-10 h-14"
                    value={idNo}
                    onChange={(e) => setIdNo(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Phone Number</label>
                <div className="relative group/field">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    className="!pl-10 h-14"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Email Address</label>
                <div className="relative group/field">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="!pl-10 h-14"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Amount Paid (₹)</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="number"
                    placeholder="1500"
                    className="!pl-10 h-14"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Receipt Number</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="REC-12345"
                    className="!pl-10 h-14"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Join Date</label>
                <div className="relative group/field">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="date"
                    className="!pl-10 h-14"
                    value={joinedAt}
                    onChange={(e) => setJoinedAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="col-span-full md:col-span-1">
                <label className="label">Valid Until</label>
                <div className="relative group/field">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="date"
                    className="!pl-10 h-14"
                    value={validTill}
                    onChange={(e) => setValidTill(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-100/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center gap-3 animate-fadeUp">
                <XCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent w-full h-16 shadow-xl shadow-orange-500/20 text-lg group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : (
                <span className="flex items-center gap-3">
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Complete Registration
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
