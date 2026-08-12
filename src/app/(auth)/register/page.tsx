'use client'

import { useState, useTransition } from 'react'
import { register } from '@/actions/auth'
import Link from 'next/link'
import {
  Store,
  Loader2,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowRight,
  Inbox
} from 'lucide-react'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }

    setRegisteredEmail(email)

    startTransition(async () => {
      const res = await register(null, formData)
      if (res?.error) {
        setError(res.error)
      } else if (res?.success) {
        setSuccess(res.success)
      }
    })
  }

  // JIKA PENDAFTARAN SUKSES: Tampilkan Desain Konfirmasi Email Gmail
  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-4 animate-fade-in">
        {/* Email send icon badge */}
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-primary animate-pulse">
          <Inbox className="w-10 h-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Verifikasi Email Anda</h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed px-2">
            Kami telah mengirimkan email aktivasi ke <span className="text-primary font-bold">{registeredEmail}</span>. Silakan periksa kotak masuk (inbox) atau folder spam Gmail Anda untuk memverifikasi akun Anda.
          </p>
        </div>

        {/* Gmail Link Button */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#006c49] hover:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm cursor-pointer shadow-md shadow-[#006c49]/10"
        >
          <span>Buka Gmail</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </a>

        {/* Kembali ke halaman login */}
        <div className="text-center text-sm text-slate-500 font-semibold pt-4 border-t border-slate-100 w-full">
          Sudah verifikasi akun?{' '}
          <Link
            href="/login"
            className="font-bold text-primary hover:underline transition"
          >
            Masuk Sekarang
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-6">
      {/* Logo / Header */}
      <div className="flex flex-col items-center text-center space-y-3 pb-2">
        <div className="w-16 h-16 bg-[#10b981] rounded-full flex items-center justify-center text-white shadow-md shadow-emerald-100">
          <Store className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Daftar Akun</h1>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
          Bergabung dengan Warung Digital untuk kemudahan transaksi.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm text-center font-semibold">
          {error}
        </div>
      )}

      {/* Register Form */}
      <form onSubmit={handleSubmit} className="space-y-4.5">
        
        {/* Nama Lengkap */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="name">
            Nama Lengkap
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Masukkan nama lengkap Anda"
              disabled={isPending}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="contoh@email.com"
              disabled={isPending}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Minimal 8 karakter"
              disabled={isPending}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 pl-11 pr-12 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* Konfirmasi Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="confirmPassword">
            Konfirmasi Password
          </label>
          <div className="relative">
            <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              placeholder="Ulangi password Anda"
              disabled={isPending}
              className="w-full bg-white border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3.5 pl-11 pr-12 text-slate-800 placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
            >
              {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#10b981] hover:bg-[#0d9488] active:scale-[0.97] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-emerald-100"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Mendaftarkan...</span>
            </>
          ) : (
            <>
              <span>Daftar Akun</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>

      {/* Redirect Link */}
      <div className="text-center text-sm text-slate-500 font-semibold pt-2 border-t border-slate-100">
        Sudah punya akun?{' '}
        <Link
          href="/login"
          className="font-bold text-primary hover:underline transition"
        >
          Masuk
        </Link>
      </div>
    </div>
  )
}
