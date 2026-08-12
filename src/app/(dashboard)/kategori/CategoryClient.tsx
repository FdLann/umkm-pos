'use client'

import { useState, useTransition } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/actions/category'
import { Plus, Trash2, Edit2, Save, X, Layers, Loader2 } from 'lucide-react'

interface Category {
  id: string
  store_id: string
  name: string
  created_at: string
}

interface CategoryClientProps {
  initialCategories: Category[]
}

export default function CategoryClient({ initialCategories }: CategoryClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (initialCategories.length !== categories.length) {
    setCategories(initialCategories)
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!newCategoryName.trim()) return

    startTransition(async () => {
      const res = await createCategory(newCategoryName)
      if (res.error) {
        setError(res.error)
      } else {
        setNewCategoryName('')
        setSuccess('Kategori berhasil ditambahkan.')
        const tempId = Math.random().toString()
        setCategories([...categories, { id: tempId, store_id: '', name: newCategoryName.trim(), created_at: '' }].sort((a,b) => a.name.localeCompare(b.name)))
      }
    })
  }

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id)
    setEditingName(currentName)
    setError(null)
    setSuccess(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveEdit = (id: string) => {
    setError(null)
    setSuccess(null)
    if (!editingName.trim()) return

    startTransition(async () => {
      const res = await updateCategory(id, editingName)
      if (res.error) {
        setError(res.error)
      } else {
        setCategories(
          categories.map(c => (c.id === id ? { ...c, name: editingName.trim() } : c)).sort((a,b) => a.name.localeCompare(b.name))
        )
        setEditingId(null)
        setSuccess('Kategori berhasil diubah.')
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    setError(null)
    setSuccess(null)
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"? Produk dalam kategori ini akan diubah ke "Tanpa Kategori".`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteCategory(id)
      if (res.error) {
        setError(res.error)
      } else {
        setCategories(categories.filter(c => c.id !== id))
        setSuccess('Kategori berhasil dihapus.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Kategori Produk</h1>
        <p className="text-slate-500 mt-1">Kelola kategori untuk mempermudah filter produk saat transaksi kasir.</p>
      </div>

      {/* Alert Error */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* Alert Success */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-primary text-sm font-semibold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Tambah Kategori */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 h-fit space-y-4 shadow-sm shadow-slate-100">
          <h2 className="text-lg font-bold text-foreground">Tambah Kategori</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="category-name">
                Nama Kategori
              </label>
              <input
                id="category-name"
                type="text"
                required
                placeholder="Contoh: Makanan Utama, Minuman"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isPending}
                className="w-full bg-white border border-surface-dim focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none transition duration-200 text-sm disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !newCategoryName.trim()}
              className="w-full bg-primary hover:bg-primary-container active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm disabled:opacity-50 cursor-pointer shadow-md shadow-primary/10"
            >
              {isPending && !editingId ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Plus className="w-4 h-4 text-white" />
              )}
              <span>Tambah</span>
            </button>
          </form>
        </div>

        {/* Daftar Kategori */}
        <div className="md:col-span-2 bg-surface border border-surface-dim rounded-3xl p-6 flex flex-col space-y-4 shadow-sm shadow-slate-100">
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Daftar Kategori Anda</h2>
          </div>

          <div className="flex-1 divide-y divide-surface-dim">
            {categories.length > 0 ? (
              categories.map((category) => (
                <div key={category.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  {editingId === category.id ? (
                    // Mode Edit Inline
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        disabled={isPending}
                        className="flex-1 bg-white border border-surface-dim focus:border-primary rounded-xl py-2 px-3 text-foreground text-sm outline-none disabled:opacity-50"
                      />
                      <button
                        onClick={() => handleSaveEdit(category.id)}
                        disabled={isPending || !editingName.trim()}
                        className="p-2.5 bg-primary hover:bg-primary-container rounded-xl text-white transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Simpan"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <Save className="w-4 h-4 text-white" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isPending}
                        className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    // Mode Tampilan Normal
                    <>
                      <span className="font-bold text-sm text-slate-700">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStartEdit(category.id, category.name)}
                          disabled={isPending}
                          className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-surface-dim transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Ubah"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category.id, category.name)}
                          disabled={isPending}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl border border-rose-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="min-h-[200px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Layers className="w-12 h-12 text-slate-350" />
                <p className="text-sm">Belum ada kategori. Silakan tambahkan di samping kiri.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
