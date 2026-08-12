'use client'

import { useState, useTransition } from 'react'
import { login } from '@/actions/auth'
import Link from 'next/link'
import { Store, ArrowRight, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await login(null, formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Logo / Header */}
      <div className="flex flex-col items-center text-center space-y-3 pb-2">
        <div className="w-16 h-16 bg-[#10b981] rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-100">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Masuk Kasir</h1>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Kelola transaksi warung dan toko UMKM Anda secara instan.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm text-center font-semibold">
          {error}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="email">
            Alamat Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="nama@email.com"
            disabled={isPending}
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            disabled={isPending}
            className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 px-4 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#006c49] hover:bg-emerald-800 active:scale-[0.97] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-[#006c49]/10"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Masuk Sekarang</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>

      {/* Redirect Link */}
      <div className="text-center text-sm text-slate-500 font-semibold pt-2 border-t border-slate-100">
        Belum punya akun?{' '}
        <Link
          href="/register"
          className="font-bold text-primary hover:underline transition"
        >
          Daftar Toko Baru
        </Link>
      </div>
    </div>
  )
}
