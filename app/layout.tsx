import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AM Fitness',
  description: 'Premium Gym Management System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <div className="orb-container">
          <div className="orb-1" />
          <div className="orb-2" />
          <div className="orb-3" />
        </div>
        <div className="relative z-10 flex min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
