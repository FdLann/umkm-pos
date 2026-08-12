'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateStore } from '@/actions/store'
import { resetTransactions } from '@/actions/transaction'
import { Store, ImageIcon, Loader2, Check, X, ShieldAlert } from 'lucide-react'

interface StoreData {
  id: string
  name: string
  description: string | null
  logo_url: string | null
}

interface PengaturanClientProps {
  initialStore: StoreData
}

export default function PengaturanClient({ initialStore }: PengaturanClientProps) {
  const [store, setStore] = useState<StoreData>(initialStore)
  const [formName, setFormName] = useState(initialStore.name)
  const [formDescription, setFormDescription] = useState(initialStore.description || '')
  
  // Logo Upload states
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initialStore.logo_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Danger Zone States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)

  // Message states
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleResetTransactions = () => {
    setResetError(null)
    if (resetConfirmText !== store.name) {
      setResetError('Nama toko tidak cocok.')
      return
    }

    startTransition(async () => {
      const res = await resetTransactions()
      if (res.error) {
        setResetError(res.error)
      } else {
        setSuccess('Semua data transaksi berhasil dihapus secara permanen.')
        setIsResetConfirmOpen(false)
        setResetConfirmText('')
        setTimeout(() => window.location.reload(), 1000)
      }
    })
  }

  // Handle Logo Selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setError('Format berkas gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.')
      return
    }

    if (file.size > 1 * 1024 * 1024) {
      setError('Ukuran logo terlalu besar. Maksimal adalah 1 MB.')
      return
    }

    setLogoFile(file)
    setLogoPreviewUrl(URL.createObjectURL(file))
    setError(null)
  }

  // Handle Save Settings
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!formName.trim()) {
      setError('Nama toko tidak boleh kosong.')
      return
    }

    startTransition(async () => {
      try {
        let finalLogoUrl = store.logo_url

        if (logoFile) {
          const supabase = createClient()
          const fileExt = logoFile.name.split('.').pop()
          const uniqueId = Math.random().toString(36).substring(2)
          const fileName = `logo-${uniqueId}-${Date.now()}.${fileExt}`
          const filePath = `store-${store.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, logoFile, {
              cacheControl: '3600',
              upsert: true,
            })

          if (uploadError) {
            throw new Error(`Gagal mengunggah logo: ${uploadError.message}`)
          }

          const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
          finalLogoUrl = data.publicUrl
        }

        const formData = new FormData()
        formData.append('id', store.id)
        formData.append('name', formName.trim())
        formData.append('description', formDescription.trim())
        if (finalLogoUrl) {
          formData.append('logo_url', finalLogoUrl)
        }

        const res = await updateStore(formData)

        if (res.error) {
          setError(res.error)
        } else {
          setSuccess('Profil toko berhasil diperbarui.')
          setStore({
            ...store,
            name: formName.trim(),
            description: formDescription.trim() || null,
            logo_url: finalLogoUrl,
          })
          setTimeout(() => window.location.reload(), 800)
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat menyimpan pengaturan toko.')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Pengaturan Toko</h1>
        <p className="text-slate-500 mt-1">Sesuaikan identitas, deskripsi, dan logo toko untuk struk transaksi belanja.</p>
      </div>

      {/* Alert Error */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Alert Success */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-primary text-sm font-semibold flex items-center space-x-2">
          <Check className="w-4 h-4 text-primary" />
          <span>{success}</span>
        </div>
      )}

      {/* Card Form */}
      <div className="bg-surface border border-surface-dim rounded-3xl p-6 md:p-8 shadow-sm shadow-slate-100">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Logo Upload Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-slate-50 border border-surface-dim rounded-2xl">
            <div className="w-24 h-24 bg-white border border-surface-dim rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Store Logo" className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-slate-300" />
              )}
            </div>
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <span className="text-sm font-bold text-slate-700 block">Logo Toko</span>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="flex gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-surface-dim hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer shadow-sm"
                >
                  Pilih Foto
                </button>
                {logoPreviewUrl !== initialStore.logo_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null)
                      setLogoPreviewUrl(initialStore.logo_url)
                    }}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-450 block">Ekstensi: JPG, PNG, WEBP. Maksimal 1MB.</span>
            </div>
          </div>

          {/* Nama Toko */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-550" htmlFor="store-name">
              Nama Toko / Usaha
            </label>
            <input
              id="store-name"
              type="text"
              required
              placeholder="Masukkan nama toko..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={isPending}
              className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
            />
          </div>

          {/* Deskripsi Toko */}
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-555" htmlFor="store-desc">
              Keterangan Struk / Slogan (Opsional)
            </label>
            <textarea
              id="store-desc"
              rows={4}
              placeholder="Contoh: Menyediakan minuman segar berkualitas. Terima kasih atas kunjungan Anda!"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              disabled={isPending}
              className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-surface-dim flex justify-end">
            <button
              type="submit"
              disabled={isPending || !formName.trim()}
              className="bg-primary hover:bg-primary-container text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer shadow-md shadow-primary/10"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Zona Bahaya - Reset Transaksi */}
      <div className="bg-surface border border-rose-200 rounded-3xl p-6 md:p-8 shadow-sm shadow-rose-50/50 space-y-6 mt-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800">Zona Bahaya: Reset Data Transaksi</h2>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Menghapus seluruh riwayat transaksi dan penjualan toko Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        {resetError && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
            {resetError}
          </div>
        )}

        {isResetConfirmOpen ? (
          <div className="bg-slate-50 border border-surface-dim p-5 rounded-2xl space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 block">
                Ketik nama toko Anda <span className="font-bold text-rose-600">"{store.name}"</span> untuk mengonfirmasi:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="Masukkan nama toko..."
                className="w-full bg-white border border-surface-dim focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl py-2 px-3 text-foreground outline-none text-sm transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetConfirmOpen(false)
                  setResetConfirmText('')
                  setResetError(null)
                }}
                disabled={isPending}
                className="px-4 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetTransactions}
                disabled={isPending || resetConfirmText !== store.name}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Mereset...' : 'Ya, Hapus Semua Transaksi'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
            >
              Reset Riwayat Transaksi
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
