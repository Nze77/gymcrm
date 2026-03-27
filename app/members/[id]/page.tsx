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
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Member, BodyRecord } from '@/types'
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
  const [isSaving, setIsSaving] = useState(false)

  // New Record Form
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [date, setDate] = useState(formatInputDate(new Date()))
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    fetchMemberData()
  }, [memberId])

  const fetchMemberData = async () => {
    setLoading(true)
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single()

    if (!memberError && memberData) {
      setMember(memberData)
      setHeight(memberData.height_cm?.toString() || '') // Default height from member profile if available
    }

    const { data: recordsData, error: recordsError } = await supabase
      .from('body_records')
      .select('*')
      .eq('member_id', memberId)
      .order('recorded_at', { ascending: false })

    if (!recordsError && recordsData) {
      setRecords(recordsData)
    }
    setLoading(false)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setImagePreview(URL.createObjectURL(file))
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
                <StatusBadge isActive={active} className="h-10 px-4 text-sm" />
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 pt-2">
              <div>
                <h1 className="text-5xl font-bold mb-3">{member.full_name}</h1>
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="glass-card w-full max-w-[500px] p-8 md:p-10 relative z-10 animate-scaleIn shadow-2xl overflow-y-auto max-h-[90vh]">
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
                  <label className="label">Weight (KG)</label>
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
                  <label className="label">Height (CM)</label>
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
                <label className="label">Record Date</label>
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
                <label className="label">Progress Photo</label>
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
    </DashboardLayout>
  )
}
