import { startOfDay } from 'date-fns'
import { Checkin } from '@/types'

// A check-in followed by a check-out within this window is treated as a
// mis-tap and is not recorded as a visit at all.
export const MIN_VISIT_MINUTES = 5

export const isTooShortVisit = (checkedInAt: string, checkedOutAt: Date = new Date()) =>
  checkedOutAt.getTime() - new Date(checkedInAt).getTime() < MIN_VISIT_MINUTES * 60 * 1000

// Open check-ins only count as "in the gym" on the day they were made. Anything
// still open once that calendar day is over is a missed check-out.
export const startOfTodayISO = () => startOfDay(new Date()).toISOString()

export const isNoCheckout = (checkin: Pick<Checkin, 'checked_in_at' | 'checked_out_at'>) =>
  !checkin.checked_out_at && new Date(checkin.checked_in_at) < startOfDay(new Date())
