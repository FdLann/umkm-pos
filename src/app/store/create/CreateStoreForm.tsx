'use client'

import { useState, useTransition } from 'react'
import { createStore } from '@/actions/store'
import { Store, Loader2, ArrowRight } from 'lucide-react'

export default function CreateStoreForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await createStore(null, formData)
      if (res?.error) {
        setError(res.error)
      }
    })
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Toko Baru</h1>
        <p className="text-sm text-slate-400">
          Langkah terakhir sebelum memulai. Buat nama toko Anda untuk mengatur kasir.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="name">
            Nama Toko / Warung
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Contoh: Warung Fadlan"
            disabled={isPending}
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 outline-none transition duration-200 text-sm disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="description">
            Deskripsi Singkat (Opsional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Contoh: Menyediakan aneka makanan, minuman dingin, dan snack hangat."
            disabled={isPending}
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-2xl py-3 px-4 text-white placeholder:text-slate-600 outline-none transition duration-200 text-sm disabled:opacity-50 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-slate-950 font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Membuat Toko...</span>
            </>
          ) : (
            <>
              <span>Mulai Berjualan</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
