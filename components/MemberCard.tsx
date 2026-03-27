'use client'

import React from 'react'
import Link from 'next/link'
import { Phone, Calendar, ArrowRight } from 'lucide-react'
import { Member } from '@/types'
import { isMemberActive, formatDate } from '@/utils/dateHelpers'
import StatusBadge from './StatusBadge'

export default function MemberCard({ member }: { member: Member }) {
  const active = isMemberActive(member.valid_till)
  
  return (
    <Link 
      href={`/members/${member.id}`}
      className="glass-card p-5 group flex flex-col gap-4 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between">
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
          <div className="flex flex-col">
            <h3 className="text-lg font-bold group-hover:text-accent transition-colors">{member.full_name}</h3>
            <div className="flex items-center gap-2 text-[var(--text-secondary)] text-sm">
              <Phone className="w-3.5 h-3.5" />
              <span>{member.phone || 'No phone'}</span>
            </div>
          </div>
        </div>
        <StatusBadge isActive={active} />
      </div>

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-[var(--divider)]">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm">
          <Calendar className="w-4 h-4" />
          <span>Valid till: <span className="text-[var(--text-secondary)] font-medium">{formatDate(member.valid_till)}</span></span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-accent group-hover:text-white transition-all transform translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    </Link>
  )
}
