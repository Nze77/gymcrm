'use client'

import Sidebar from './Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <main className="flex-1 lg:ml-[228px] overflow-x-hidden pt-24 lg:pt-12 pb-24 px-6 md:px-12 flex flex-col items-center">
        <div className="w-full max-w-[820px] animate-fadeUp">
          {children}
        </div>
      </main>
    </div>
  )
}