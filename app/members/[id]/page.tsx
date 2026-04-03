'use client'

import React, { useState, useEffect, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Plus,
  Loader2,
  ArrowLeft,
  Ruler,
  Weight,
  Camera,
  X,
  Edit,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member, BodyRecord, Membership } from '@/types'
import { isMemberActive, formatDate, formatInputDate } from '@/utils/dateHelpers'
import DashboardLayout from '@/components/DashboardLayout'
import StatusBadge from '@/components/StatusBadge'
import BodyRecordCard from '@/components/BodyRecordCard'
import { compressImage } from '@/utils/compressImage'

export default function MemberDetailPage() {
  const params = useParams()
  const memberId = params.id as string
  const router = useRouter()

  const [member, setMember] = useState<Member | null>(null)
  const [records, setRecords] = useState<BodyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [memberships, setMemberships] = useState<Membership[]>([])

  // Edit Member Form
  const [editFullName, setEditFullName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editValidTill, setEditValidTill] = useState('')
  const [editAmountPaid, setEditAmountPaid] = useState('')
  const [editReceiptNumber, setEditReceiptNumber] = useState('')

  // Renew Membership Form
  const [renewStartDate, setRenewStartDate] = useState(formatInputDate(new Date()))
  const [renewValidTill, setRenewValidTill] = useState('')
  const [renewAmountPaid, setRenewAmountPaid] = useState('')
  const [renewPaymentMethod, setRenewPaymentMethod] = useState('Cash')
  const [renewReceiptNumber, setRenewReceiptNumber] = useState('')

  // New Record Form
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [date, setDate] = useState(formatInputDate(new Date()))
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Edit Member Image State
  const [editImage, setEditImage] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchMemberData()
  }, [memberId])

  const fetchMemberData = async () => {
    setLoading(true)
    try {
      const [memberRes, recordsRes, membershipsRes] = await Promise.all([
        supabase
          .from('members')
          .select('*')
          .eq('id', memberId)
          .single(),
        supabase
          .from('body_records')
          .select('*')
          .eq('member_id', memberId)
          .order('recorded_at', { ascending: false }),
        supabase
          .from('memberships')
          .select('*')
          .eq('uid', memberId)
          .order('created_at', { ascending: false })
      ])

      const { data: memberData, error: memberError } = memberRes
      const { data: recordsData, error: recordsError } = recordsRes

      if (!memberError && memberData) {
        setMember(memberData)
        setHeight(memberData.height_cm?.toString() || '')
      }

      if (!recordsError && recordsData) {
        setRecords(recordsData)
      }

      const { data: membershipsData, error: membershipsError } = membershipsRes as any
      if (!membershipsError && membershipsData) {
        setMemberships(membershipsData)
      }
    } catch (err) {
      console.error('Error fetching member data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setEditImage(file)
      setEditImagePreview(URL.createObjectURL(file))
    }
  }

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    let imageUrl = null
    if (image) {
      const compressed = await compressImage(image)
      const fileName = `${memberId}/${Date.now()}.jpg`
      const { data, error } = await supabase.storage
        .from('body-progress')
        .upload(fileName, compressed)

      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('body-progress')
          .getPublicUrl(fileName)
        imageUrl = publicUrl
      }
    }

    const { error } = await supabase
      .from('body_records')
      .insert([{
        member_id: memberId,
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        image_url: imageUrl,
        recorded_at: date
      }])

    if (!error) {
      setIsModalOpen(false)
      fetchMemberData()
      // Reset form
      setWeight('')
      setImage(null)
      setImagePreview(null)
    }
    setIsSaving(false)
  }

  const openEditModal = () => {
    if (member) {
      setEditFullName(member.full_name)
      setEditPhone(member.phone || '')
      setEditValidTill(formatInputDate(new Date(member.valid_till)))
      setEditAmountPaid(member.amount_paid?.toString() || '0')
      setEditReceiptNumber(member.receipt_number || '')
      setEditImage(null)
      setEditImagePreview(member.profile_image_url || null)
      setIsEditModalOpen(true)
    }
  }

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let profileImageUrl = member?.profile_image_url || null

      if (editImage) {
        const compressed = await compressImage(editImage)
        const fileName = `${Date.now()}-${editFullName.replace(/\s+/g, '-').toLowerCase()}.jpg`
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

      const { error } = await supabase
        .from('members')
        .update({
          full_name: editFullName,
          phone: editPhone,
          valid_till: editValidTill,
          amount_paid: parseFloat(editAmountPaid) || 0,
          receipt_number: editReceiptNumber,
          profile_image_url: profileImageUrl,
          is_active: new Date(editValidTill) >= new Date()
        })
        .eq('id', memberId)

      if (error) throw error

      setIsEditModalOpen(false)
      fetchMemberData()
    } catch (err: any) {
      console.error('Error updating member:', err)
      alert(err.message || 'Failed to update member')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRenewMembership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return
    setIsSaving(true)

    try {
      // 1. Create the membership record
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert([{
          uid: memberId,
          full_name: member.full_name,
          start_date: renewStartDate,
          valid_till: renewValidTill,
          amount_paid: parseFloat(renewAmountPaid) || 0,
          payment_method: renewPaymentMethod,
          receipt_number: renewReceiptNumber
        }])

      if (membershipError) throw membershipError

      // 2. Update the member record with most recent data
      const { error: memberUpdateError } = await supabase
        .from('members')
        .update({
          valid_till: renewValidTill,
          amount_paid: parseFloat(renewAmountPaid) || 0,
          receipt_number: renewReceiptNumber,
          is_active: new Date(renewValidTill) >= new Date()
        })
        .eq('id', memberId)

      if (memberUpdateError) throw memberUpdateError

      setIsRenewModalOpen(false)
      fetchMemberData()

      // Reset form
      setRenewAmountPaid('')
      setRenewReceiptNumber('')
      setRenewPaymentMethod('Cash')
    } catch (err: any) {
      console.error('Error renewing membership:', err)
      alert(err.message || 'Failed to renew membership')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-40">
          <Loader2 className="w-10 h-10 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    )
  }

  if (!member) return null

  const active = isMemberActive(member.valid_till)

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-accent transition-colors font-bold text-sm tracking-widest uppercase mb-4">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Members</span>
          </button>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 md:w-40 md:h-40 glass-card p-2 rounded-3xl relative">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-[var(--input-bg)] border border-[var(--input-border)]">
                {member.profile_image_url ? (
                  <img src={member.profile_image_url} alt={member.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-[var(--text-muted)]">
                    {member.full_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-3 -right-3">
                <StatusBadge isActive={active} className="h-10 px-4 text-sm backdrop-blur-4xl" />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 pt-2">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <h1 className="text-5xl font-bold">{member.full_name}</h1>
                  <button onClick={openEditModal} className="p-2 bg-[var(--input-bg)] rounded-xl hover:text-accent transition-colors" title="Edit Member">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[var(--text-secondary)] text-lg">Member since {formatDate(member.joined_at)}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
                <div className="flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm border border-[var(--input-border)] group-hover/item:scale-110 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="label mb-0 text-[10px] tracking-widest font-black uppercase">Phone</div>
                    <div className="text-lg font-bold">{member.phone || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm border border-[var(--input-border)] group-hover/item:scale-110 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="label mb-0 text-[10px] tracking-widest font-black uppercase">Valid Till</div>
                    <div className="text-lg font-bold">{formatDate(member.valid_till)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-secondary)] shadow-sm border border-[var(--input-border)] group-hover/item:scale-110 transition-transform">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="label mb-0 text-[10px] tracking-widest font-black uppercase">Paid Status</div>
                    <div className="text-lg font-bold">₹{member.amount_paid || 0}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="self-end md:mb-5 -mt-20 md:mt-0">
              <button
                onClick={() => {
                  setRenewValidTill('')
                  setIsRenewModalOpen(true)
                }}
                className="btn btn-accent h-12 px-4 gap-2 shadow-xl shadow-orange-500/20 text-sm"
              >
                <Plus className="w-4 h-4" />
                Renew
              </button>
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-8 pb-20">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Progress Tracking</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary h-14 px-8 gap-3 shadow-xl shadow-black/5"
            >
              <Plus className="w-5 h-5" />
              Add Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {records.length > 0 ? (
              records.map((record) => (
                <div key={record.id} className="animate-scaleIn">
                  <BodyRecordCard record={record} />
                </div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center glass-card">
                <p className="text-[var(--text-secondary)] text-xl font-bold mb-2">No progress records yet.</p>
                <p className="text-[var(--text-muted)] mb-8">Start tracking body metrics and photos to see progress.</p>
                <button onClick={() => setIsModalOpen(true)} className="btn btn-secondary gap-3 mx-auto">
                  <Plus className="w-5 h-5" />
                  Add First Record
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-8 pb-40">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Membership History</h2>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--input-border)] bg-[var(--input-bg)]">
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Receipt No</th>
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Start Date</th>
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Valid Till</th>
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Amount</th>
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Method</th>
                    <th className="px-6 py-4 text-[10px] tracking-widest font-black uppercase text-[var(--text-muted)]">Date Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {memberships.length > 0 ? (
                    memberships.map((m) => (
                      <tr key={m.id} className="border-b border-[var(--input-border)] hover:bg-[var(--input-bg)]/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-accent">{m.receipt_number || '—'}</td>
                        <td className="px-6 py-4 font-bold">{formatDate(m.start_date)}</td>
                        <td className="px-6 py-4 font-bold">{formatDate(m.valid_till)}</td>
                        <td className="px-6 py-4 font-bold text-green-500">₹{m.amount_paid}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full bg-[var(--input-bg)] text-[10px] font-black uppercase tracking-widest border border-[var(--input-border)]">
                            {m.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[var(--text-muted)] text-sm">{formatDate(m.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center text-[var(--text-muted)] italic">
                        No membership records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-transparent" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card !bg-[var(--modal-bg-dense)] w-full max-w-[500px] p-8 md:p-10 relative z-10 animate-scaleIn shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">New Body Record</h2>
                <p className="text-[var(--text-secondary)]">Track current stats and metrics</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-[var(--input-bg)] rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label !text-[var(--modal-text-dense)] font-bold">Weight (KG)</label>
                  <div className="relative group/field">
                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="70.5"
                      className="pl-16 h-14"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label !text-[var(--modal-text-dense)] font-bold">Height (CM)</label>
                  <div className="relative group/field">
                    <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="number"
                      step="0.1"
                      placeholder="175.0"
                      className="pl-16 h-14"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Record Date</label>
                <div className="relative group/field">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="date"
                    className="pl-16 h-14"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Progress Photo</label>
                <div className="relative group/field h-40 border-2 border-dashed border-[var(--input-border)] rounded-3xl flex flex-col items-center justify-center gap-3 bg-[var(--input-bg)] hover:bg-orange-50/20 hover:border-accent transition-all cursor-pointer overflow-hidden">
                  {imagePreview ? (
                    <>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-accent shadow-sm">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-[var(--text-secondary)]">Click to upload photo</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-accent w-full h-16 shadow-xl shadow-orange-500/20 text-lg group"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <span className="flex items-center gap-3">
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Save Progress Record
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-transparent" onClick={() => setIsEditModalOpen(false)} />
          <div className="glass-card !bg-[var(--modal-bg-dense)] w-full max-w-[500px] p-8 md:p-10 relative z-10 animate-scaleIn shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">Edit Member</h2>
                <p className="text-[var(--text-secondary)]">Update member details</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-[var(--input-bg)] rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-8">
              {/* Profile Photo Edit */}
              <div className="flex flex-col items-center gap-6 mb-8">
                <div className="relative group/photo w-32 h-32 rounded-3xl bg-[var(--input-bg)] border-2 border-dashed border-[var(--input-border)] hover:border-accent flex items-center justify-center transition-all cursor-pointer overflow-hidden shadow-inner">
                  {editImagePreview ? (
                    <>
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-accent shadow-sm">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest leading-none">Change Photo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Full Name</label>
                <div className="relative group/field">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    className="!pl-10 h-14"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Phone Number</label>
                <div className="relative group/field">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="tel"
                    className="!pl-10 h-14"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Valid Until</label>
                <div className="relative group/field">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="date"
                    className="!pl-10 h-14"
                    value={editValidTill}
                    onChange={(e) => setEditValidTill(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Amount Paid</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="number"
                    className="!pl-10 h-14"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Receipt Number</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    className="!pl-10 h-14"
                    value={editReceiptNumber}
                    onChange={(e) => setEditReceiptNumber(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-accent w-full h-16 shadow-xl shadow-orange-500/20 text-lg group"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                ) : (
                  <span className="flex items-center gap-3">
                    <Edit className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Update Member
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Renew Membership Modal */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-transparent" onClick={() => setIsRenewModalOpen(false)} />
          <div className="glass-card !bg-[var(--modal-bg-dense)] w-full max-w-[500px] p-8 md:p-10 relative z-10 animate-scaleIn shadow-2xl overflow-y-auto max-h-[90vh] backdrop-blur-[10px]">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold mb-2">Renew Membership</h2>
                <p className="text-[var(--text-secondary)]">Process a new payment</p>
              </div>
              <button onClick={() => setIsRenewModalOpen(false)} className="p-3 bg-[var(--input-bg)] rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleRenewMembership} className="space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label !text-[var(--modal-text-dense)] font-bold">Start Date</label>
                  <div className="relative group/field">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="date"
                      className="!pl-10 h-14"
                      value={renewStartDate}
                      onChange={(e) => setRenewStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label !text-[var(--modal-text-dense)] font-bold">Valid Until</label>
                  <div className="relative group/field">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                    <input
                      type="date"
                      className="!pl-10 h-14"
                      value={renewValidTill}
                      onChange={(e) => setRenewValidTill(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Amount Paid (₹)</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="number"
                    placeholder="0.00"
                    className="!pl-10 h-14"
                    value={renewAmountPaid}
                    onChange={(e) => setRenewAmountPaid(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Payment Method</label>
                <div className="grid grid-cols-3 gap-4">
                  {['Cash', 'UPI', 'Card'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setRenewPaymentMethod(method)}
                      className={`h-14 rounded-2xl border-2 font-bold transition-all ${renewPaymentMethod === method
                        ? 'border-accent bg-orange-50 text-accent'
                        : 'border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-secondary)] hover:border-accent/40'
                        }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label !text-[var(--modal-text-dense)] font-bold">Receipt Number</label>
                <div className="relative group/field">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within/field:text-accent transition-colors" />
                  <input
                    type="text"
                    placeholder="4444"
                    className="!pl-10 h-14"
                    value={renewReceiptNumber}
                    onChange={(e) => setRenewReceiptNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-accent h-14 px-10 shadow-xl shadow-orange-500/20 font-bold group"
                >
                  {isSaving ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  ) : (
                    <span className="flex items-center gap-3">
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Process Renewal
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
