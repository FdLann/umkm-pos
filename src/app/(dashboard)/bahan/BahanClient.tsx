'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  createIngredient,
  updateIngredient,
  deleteIngredient,
  IngredientData,
  IngredientInput,
} from '@/actions/ingredient'
import { formatRupiah, formatUnitCost } from '@/lib/pricing'
import { cacheIngredients, getCachedIngredients } from '@/lib/offlineDb'
import {
  Plus,
  Search,
  Wheat,
  Edit2,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Loader2,
  HelpCircle,
  Package,
} from 'lucide-react'

interface BahanClientProps {
  initialIngredients: IngredientData[]
}

const COMMON_UNITS = [
  { value: 'gram', label: 'gram (gr)' },
  { value: 'ml', label: 'mililiter (ml)' },
  { value: 'pcs', label: 'pcs / buah' },
  { value: 'lembar', label: 'lembar' },
  { value: 'sdm', label: 'sendok makan (sdm)' },
  { value: 'sdt', label: 'sendok teh (sdt)' },
  { value: 'butir', label: 'butir' },
  { value: 'porsi', label: 'porsi' },
  { value: 'pack', label: 'pack / bungkus' },
]

export default function BahanClient({ initialIngredients }: BahanClientProps) {
  const [ingredients, setIngredients] = useState<IngredientData[]>(initialIngredients)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<IngredientData | null>(null)
  const [formName, setFormName] = useState('')
  const [formUnit, setFormUnit] = useState('gram')
  const [customUnit, setCustomUnit] = useState('')
  const [formPurchasePrice, setFormPurchasePrice] = useState('')
  const [formPurchaseQty, setFormPurchaseQty] = useState('')
  const [formTrackStock, setFormTrackStock] = useState(false)
  const [formStock, setFormStock] = useState('')
  const [formMinStock, setFormMinStock] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Sync and cache in IndexedDB
  useEffect(() => {
    if (initialIngredients && initialIngredients.length > 0) {
      setIngredients(initialIngredients)
      cacheIngredients(initialIngredients).catch(console.error)
    } else {
      // Fallback offline
      getCachedIngredients().then((cached) => {
        if (cached && cached.length > 0) setIngredients(cached)
      }).catch(console.error)
    }
  }, [initialIngredients])

  // Live calculation of cost per unit in modal form
  const priceNum = parseFloat(formPurchasePrice) || 0
  const qtyNum = parseFloat(formPurchaseQty) || 0
  const activeUnit = formUnit === 'custom' ? customUnit.trim() || 'unit' : formUnit
  const liveCostPerUnit = qtyNum > 0 ? priceNum / qtyNum : 0

  // Filtered search list
  const filteredIngredients = ingredients.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.unit.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenCreate = () => {
    setEditingIngredient(null)
    setFormName('')
    setFormUnit('gram')
    setCustomUnit('')
    setFormPurchasePrice('')
    setFormPurchaseQty('1000') // default 1000 gram
    setFormTrackStock(false)
    setFormStock('')
    setFormMinStock('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: IngredientData) => {
    setEditingIngredient(item)
    setFormName(item.name)
    const isCommon = COMMON_UNITS.some((u) => u.value === item.unit)
    if (isCommon) {
      setFormUnit(item.unit)
      setCustomUnit('')
    } else {
      setFormUnit('custom')
      setCustomUnit(item.unit)
    }
    setFormPurchasePrice(item.purchase_price.toString())
    setFormPurchaseQty(item.purchase_qty.toString())
    setFormTrackStock(item.track_stock)
    setFormStock(item.stock ? item.stock.toString() : '0')
    setFormMinStock(item.min_stock ? item.min_stock.toString() : '0')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError('Nama bahan baku wajib diisi.')
      return
    }

    const finalUnit = formUnit === 'custom' ? customUnit.trim().toLowerCase() : formUnit.toLowerCase()
    if (!finalUnit) {
      setFormError('Satuan unit wajib diisi.')
      return
    }

    const price = parseFloat(formPurchasePrice)
    if (isNaN(price) || price < 0) {
      setFormError('Harga beli tidak valid.')
      return
    }

    const qty = parseFloat(formPurchaseQty)
    if (isNaN(qty) || qty <= 0) {
      setFormError('Isi per kemasan harus lebih dari 0.')
      return
    }

    const payload: IngredientInput = {
      name: formName.trim(),
      unit: finalUnit,
      purchasePrice: price,
      purchaseQty: qty,
      trackStock: formTrackStock,
      stock: formTrackStock ? Math.max(0, parseFloat(formStock) || 0) : 0,
      minStock: formTrackStock ? Math.max(0, parseFloat(formMinStock) || 0) : 0,
    }

    startTransition(async () => {
      let res
      if (editingIngredient) {
        res = await updateIngredient(editingIngredient.id, payload)
      } else {
        res = await createIngredient(payload)
      }

      if (res?.error) {
        setFormError(res.error)
      } else {
        setIsModalOpen(false)
        setGlobalMessage({
          type: 'success',
          text: editingIngredient ? 'Bahan baku berhasil diubah.' : 'Bahan baku baru berhasil ditambahkan.',
        })
        setTimeout(() => setGlobalMessage(null), 4000)

        // Optimistic local update
        if (res.data) {
          const updatedItem: IngredientData = res.data
          if (editingIngredient) {
            setIngredients((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)))
          } else {
            setIngredients((prev) => [...prev, updatedItem].sort((a, b) => a.name.localeCompare(b.name)))
          }
        }
      }
    })
  }

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus bahan baku "${name}"?\nBahan ini tidak akan bisa digunakan di resep produk lagi.`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteIngredient(id)
      if (res?.error) {
        setGlobalMessage({ type: 'error', text: res.error })
      } else {
        setIngredients((prev) => prev.filter((item) => item.id !== id))
        setGlobalMessage({ type: 'success', text: `Bahan baku "${name}" berhasil dihapus.` })
      }
      setTimeout(() => setGlobalMessage(null), 4000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Global Alert Notification */}
      {globalMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm font-bold animate-in fade-in transition ${
            globalMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
          }`}
        >
          {globalMessage.type === 'success' ? (
            <Check className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{globalMessage.text}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Wheat className="w-7 h-7 text-primary" />
            Bahan Baku & HPP
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Catat harga beli kemasan bahan mentah untuk menghitung HPP resep produk secara otomatis.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-white px-5 py-3 rounded-2xl font-bold shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Tambah Bahan</span>
        </button>
      </div>

      {/* Search & Statistics Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama bahan baku atau satuan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
          />
        </div>

        <div className="bg-surface-container p-4 rounded-2xl border border-surface-dim flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold">Total Bahan Terdaftar</p>
              <p className="text-lg font-extrabold text-foreground">{ingredients.length} Macam</p>
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients List (Cards on Mobile, Table on Desktop) */}
      {filteredIngredients.length === 0 ? (
        <div className="bg-surface-container rounded-3xl p-10 text-center border border-surface-dim">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Wheat className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">Belum ada bahan baku</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6">
            {searchTerm
              ? 'Tidak ditemukan bahan baku dengan kata kunci pencarian tersebut.'
              : 'Mulai dengan menambahkan bahan mentah seperti Gula, Kopi, Susu, atau Tepung.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Bahan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-surface-container rounded-3xl border border-surface-dim overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high/60 border-b border-surface-dim text-slate-600 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-4">Nama Bahan</th>
                  <th className="px-5 py-4">Beli Kemasan</th>
                  <th className="px-5 py-4">Harga per Satuan</th>
                  <th className="px-5 py-4">Stok Bahan</th>
                  <th className="px-5 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-dim font-medium">
                {filteredIngredients.map((item) => {
                  const costPerUnit = Number(item.cost_per_unit) || (item.purchase_qty > 0 ? item.purchase_price / item.purchase_qty : 0)
                  const isLowStock = item.track_stock && item.stock <= item.min_stock

                  return (
                    <tr key={item.id} className="hover:bg-surface-container-high/30 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-foreground text-sm">{item.name}</div>
                        <div className="text-xs text-slate-500 font-medium">Satuan: {item.unit}</div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        <div className="font-bold">{formatRupiah(item.purchase_price)}</div>
                        <div className="text-xs text-slate-500">per {item.purchase_qty} {item.unit}</div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-800 font-extrabold text-xs border border-emerald-500/20">
                          {formatUnitCost(costPerUnit, item.unit)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {item.track_stock ? (
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                                {item.stock} {item.unit}
                              </span>
                              {isLowStock && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[10px] font-extrabold border border-rose-500/20">
                                  Menipis
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">Min: {item.min_stock} {item.unit}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Tidak dilacak</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-2 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-xl transition cursor-pointer"
                            title="Edit Bahan"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                            title="Hapus Bahan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Form Tambah / Edit Bahan Baku */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-surface-dim overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-surface-dim">
              <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <Wheat className="w-5 h-5 text-primary" />
                {editingIngredient ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Nama Bahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Bahan Baku <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gula Pasir, Kopi Arabika, Susu UHT"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                />
              </div>

              {/* Satuan Unit Takaran */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Satuan Takaran Resep <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COMMON_UNITS.map((u) => (
                    <button
                      key={u.value}
                      type="button"
                      onClick={() => setFormUnit(u.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        formUnit === u.value
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-surface-container text-slate-700 border-surface-dim hover:border-slate-300'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormUnit('custom')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                      formUnit === 'custom'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container text-slate-700 border-surface-dim hover:border-slate-300'
                    }`}
                  >
                    Lainnya...
                  </button>
                </div>

                {formUnit === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Ketik satuan baru (contoh: kaleng, botol, sachet)"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    className="mt-2 w-full px-4 py-2.5 bg-surface-container rounded-xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                  />
                )}
              </div>

              {/* Pembelian Kemasan (Harga & Isi) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Beli Kemasan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Contoh: 16000"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Isi per Kemasan ({activeUnit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0.001"
                    step="any"
                    placeholder="Contoh: 1000"
                    value={formPurchaseQty}
                    onChange={(e) => setFormPurchaseQty(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                  />
                </div>
              </div>

              {/* Live Preview Harga per Unit */}
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500">Harga Modal per Satuan ({activeUnit}):</p>
                  <p className="text-base font-extrabold text-primary">
                    {formatUnitCost(liveCostPerUnit, activeUnit)}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 max-w-[170px]">
                  Otomatis dipakai saat menghitung resep produk.
                </div>
              </div>

              {/* Lacak Stok Bahan Baku */}
              <div className="pt-2 border-t border-surface-dim">
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formTrackStock}
                    onChange={(e) => setFormTrackStock(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Lacak Sisa Stok Bahan Baku Ini
                  </span>
                </label>

                {formTrackStock && (
                  <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Sisa Stok Saat Ini ({activeUnit})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Contoh: 5000"
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-surface-dim text-sm font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Batas Minimum Peringatan
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Contoh: 500"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-surface-container rounded-xl border border-surface-dim text-sm font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-surface-dim">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingIngredient ? 'Simpan Perubahan' : 'Tambah Bahan'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
