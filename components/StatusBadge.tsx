import React from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export default function StatusBadge({ isActive, className }: { isActive: boolean, className?: string }) {
  return (
    <span className={cn(
      "badge",
      isActive ? "badge-active" : "badge-inactive",
      className
    )}>
      {isActive ? "Active" : "Inactive"}
    </span>
  )
}
