import { format, isAfter, isBefore, addDays, startOfDay, parseISO, differenceInCalendarDays } from 'date-fns'

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'MMM dd, yyyy')
}

export const formatInputDate = (date: Date) => {
  return format(date, 'yyyy-MM-dd')
}

export const isMemberActive = (validTill: string) => {
  const today = startOfDay(new Date())
  const expiry = startOfDay(parseISO(validTill))
  return isAfter(expiry, today) || expiry.getTime() === today.getTime()
}

export const getExpiryWindow = (days: number) => {
  const today = startOfDay(new Date())
  const windowEnd = addDays(today, days)
  return { start: today, end: windowEnd }
}

// Calendar days from today until expiry, floored at 0 (an expiry today or in the
// past reads as "today", never a negative countdown).
export const daysUntilExpiry = (validTill: string | Date) => {
  const expiry = typeof validTill === 'string' ? parseISO(validTill) : validTill
  return Math.max(0, differenceInCalendarDays(startOfDay(expiry), startOfDay(new Date())))
}
