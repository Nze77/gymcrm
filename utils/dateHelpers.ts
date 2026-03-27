import { format, isAfter, isBefore, addDays, startOfDay, parseISO } from 'date-fns'

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
