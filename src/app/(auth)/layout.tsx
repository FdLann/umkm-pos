import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f8f9ff] p-4 md:p-8 font-sans relative">
      {/* Top gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-primary to-emerald-800" />
      
      <div className="w-full max-w-[460px] relative z-10">
        <div className="bg-white border border-[#cbdbf5] rounded-3xl shadow-lg shadow-slate-100/50 p-8 md:p-10 text-slate-800">
          {children}
        </div>
      </div>
    </div>
  )
}
