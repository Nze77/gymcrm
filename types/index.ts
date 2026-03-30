export interface Member {
  id: string
  full_name: string
  phone?: string
  email?: string
  joined_at: string
  valid_till: string
  amount_paid?: number
  receipt_number?: string
  is_active: boolean
  profile_image_url?: string
  created_at: string
}

export interface Checkin {
  id: string
  member_id: string
  checked_in_at: string
  checked_out_at?: string
}

export interface BodyRecord {
  id: string
  member_id: string
  weight_kg?: number
  height_cm?: number
  image_url?: string
  recorded_at: string
}

export interface MessageLog {
  id: string
  member_id: string
  message_type: 'welcome' | 'reminder'
  sent_at: string
}
