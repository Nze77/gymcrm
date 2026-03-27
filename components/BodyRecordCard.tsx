'use client'

import React from 'react'
import { Weight, Ruler, Calendar, ArrowUpRight } from 'lucide-react'
import { BodyRecord } from '@/types'
import { formatDate } from '@/utils/dateHelpers'

export default function BodyRecordCard({ record }: { record: BodyRecord }) {
  return (
    <div className="glass-card p-6 flex flex-col gap-6 group hover:shadow-2xl hover:shadow-orange-500/5 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-[var(--text-muted)] group-hover:text-accent transition-colors font-bold text-sm tracking-widest uppercase mb-4">
          <Calendar className="w-4 h-4" />
          <span>Recorded {formatDate(record.recorded_at)}</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-accent group-hover:text-white transition-all transform opacity-0 group-hover:opacity-100">
          <ArrowUpRight className="w-5 h-5" />
        </div>
      </div>

      <div className="flex items-center gap-8 md:gap-12">
        <div className="flex items-center gap-4 group/item">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200/50 group-hover/item:scale-110 transition-transform">
            <Weight className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="label mb-0 text-orange-600/60 uppercase text-[9px] tracking-widest font-black">Weight</div>
            <div className="text-xl font-bold flex items-baseline gap-1">
              {record.weight_kg} <span className="text-xs text-[var(--text-muted)] font-normal uppercase">Kg</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 group/item">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-sm border border-orange-200/50 group-hover/item:scale-110 transition-transform">
            <Ruler className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="label mb-0 text-orange-600/60 uppercase text-[9px] tracking-widest font-black">Height</div>
            <div className="text-xl font-bold flex items-baseline gap-1">
              {record.height_cm} <span className="text-xs text-[var(--text-muted)] font-normal uppercase">Cm</span>
            </div>
          </div>
        </div>
      </div>

      {record.image_url && (
        <div className="mt-2 aspect-square md:aspect-video rounded-2xl overflow-hidden bg-[var(--input-bg)] group-hover:shadow-2xl transition-all duration-300">
          <img 
            src={record.image_url} 
            alt={`Progress on ${record.recorded_at}`} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
          />
        </div>
      )}
    </div>
  )
}
