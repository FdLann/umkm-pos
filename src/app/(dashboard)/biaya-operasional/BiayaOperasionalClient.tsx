'use client'

import React, { useState, useTransition, useEffect } from 'react'
import {
  createFixedCost,
  deleteFixedCost,
  updateTargetMonthlySales,
  FixedCostData,
  StorePricingSettings,
} from '@/actions/fixedCost'
import {
  calculateDepreciation,
  formatRupiah,
} from '@/lib/pricing'
import { cacheFixedCosts, getCachedFixedCosts } from '@/lib/offlineDb'
import {
  Coins,
  Plus,
  Trash2,
  Wrench,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Check,
  X,
  Loader2,
  HelpCircle,
  Building,
  Zap,
  Users,
  Target,
} from 'lucide-react'

interface BiayaOperasionalClientProps {
  initialFixedCosts: FixedCostData[]
  initialSettings: StorePricingSettings
}

export default function BiayaOperasionalClient({
  initialFixedCosts,
  initialSettings,
}: BiayaOperasionalClientProps) {
  const [fixedCosts, setFixedCosts] = useState<FixedCostData[]>(initialFixedCosts)
  const [targetSales, setTargetSales] = useState<number>(initialSettings.targetMonthlySales || 500)
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [tempTargetSales, setTempTargetSales] = useState(targetSales.toString())

  const [isPending, startTransition] = useTransition()
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Modal Biaya Rutin Bulanan
  const [isModalRutinOpen, setIsModalRutinOpen] = useState(false)
  const [formRutinName, setFormRutinName] = useState('')
  const [formRutinAmount, setFormRutinAmount] = useState('')
  const [formRutinError, setFormRutinError] = useState<string | null>(null)

  // Modal Kalkulator Penyusutan Alat
  const [isModalAlatOpen, setIsModalAlatOpen] = useState(false)
  const [formAlatName, setFormAlatName] = useState('')
  const [formAlatPrice, setFormAlatPrice] = useState('')
  const [formAlatSalvage, setFormAlatSalvage] = useState('0')
  const [formAlatMonths, setFormAlatMonths] = useState('24') // 2 tahun default
  const [formAlatError, setFormAlatError] = useState<string | null>(null)

  // Sync and cache in IndexedDB
  useEffect(() => {
    if (initialFixedCosts && initialFixedCosts.length > 0) {
      setFixedCosts(initialFixedCosts)
      cacheFixedCosts(initialFixedCosts).catch(console.error)
    } else {
      getCachedFixedCosts().then((cached) => {
        if (cached && cached.length > 0) setFixedCosts(cached)
      }).catch(console.error)
    }
  }, [initialFixedCosts])

  // Total summary calculations
  const totalRutin = fixedCosts
    .filter((c) => c.type === 'bulanan')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const totalPenyusutan = fixedCosts
    .filter((c) => c.type === 'penyusutan')
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  const totalFixedMonthly = totalRutin + totalPenyusutan
  const fixedPerUnit = targetSales > 0 ? totalFixedMonthly / targetSales : 0

  // Live depreciation computation in modal
  const liveAlatDepreciation = calculateDepreciation(
    parseFloat(formAlatPrice) || 0,
    parseFloat(formAlatSalvage) || 0,
    parseFloat(formAlatMonths) || 1
  )

  // Handle Save Target Penjualan
  const handleSaveTarget = () => {
    const val = parseInt(tempTargetSales)
    if (isNaN(val) || val <= 0) {
      setGlobalMessage({ type: 'error', text: 'Target porsi bulanan harus lebih dari 0.' })
      return
    }

    startTransition(async () => {
      const res = await updateTargetMonthlySales(val)
      if (res?.error) {
        setGlobalMessage({ type: 'error', text: res.error })
      } else {
        setTargetSales(val)
        setIsEditingTarget(false)
        setGlobalMessage({ type: 'success', text: 'Target penjualan bulanan berhasil diperbarui.' })
      }
      setTimeout(() => setGlobalMessage(null), 4000)
    })
  }

  // Handle Submit Biaya Rutin
  const handleSubmitRutin = (e: React.FormEvent) => {
    e.preventDefault()
    setFormRutinError(null)

    if (!formRutinName.trim()) {
      setFormRutinError('Nama biaya rutin wajib diisi.')
      return
    }

    const amount = parseFloat(formRutinAmount)
    if (isNaN(amount) || amount <= 0) {
      setFormRutinError('Nominal biaya harus lebih dari 0.')
      return
    }

    startTransition(async () => {
      const res = await createFixedCost({
        name: formRutinName.trim(),
        amount,
        type: 'bulanan',
      })

      if (res?.error) {
        setFormRutinError(res.error)
      } else {
        setIsModalRutinOpen(false)
        setFormRutinName('')
        setFormRutinAmount('')
        if (res.data) {
          setFixedCosts((prev) => [res.data, ...prev])
        }
        setGlobalMessage({ type: 'success', text: 'Biaya rutin bulanan berhasil ditambahkan.' })
        setTimeout(() => setGlobalMessage(null), 4000)
      }
    })
  }

  // Handle Submit Penyusutan Alat
  const handleSubmitAlat = (e: React.FormEvent) => {
    e.preventDefault()
    setFormAlatError(null)

    if (!formAlatName.trim()) {
      setFormAlatError('Nama alat / aset wajib diisi.')
      return
    }

    const price = parseFloat(formAlatPrice)
    const salvage = parseFloat(formAlatSalvage) || 0
    const months = parseFloat(formAlatMonths)

    if (isNaN(price) || price <= 0) {
      setFormAlatError('Harga beli alat harus lebih dari 0.')
      return
    }
    if (isNaN(months) || months <= 0) {
      setFormAlatError('Umur pakai alat (bulan) harus lebih dari 0.')
      return
    }

    const monthlyDepreciation = Math.round(calculateDepreciation(price, salvage, months))

    startTransition(async () => {
      const res = await createFixedCost({
        name: `${formAlatName.trim()} (Penyusutan ${months} bln)`,
        amount: monthlyDepreciation,
        type: 'penyusutan',
      })

      if (res?.error) {
        setFormAlatError(res.error)
      } else {
        setIsModalAlatOpen(false)
        setFormAlatName('')
        setFormAlatPrice('')
        setFormAlatSalvage('0')
        setFormAlatMonths('24')
        if (res.data) {
          setFixedCosts((prev) => [res.data, ...prev])
        }
        setGlobalMessage({ type: 'success', text: 'Penyusutan alat berhasil dihitung dan ditambahkan.' })
        setTimeout(() => setGlobalMessage(null), 4000)
      }
    })
  }

  // Handle Delete
  const handleDeleteCost = (id: string, name: string) => {
    if (!confirm(`Hapus biaya "${name}"?`)) return

    startTransition(async () => {
      const res = await deleteFixedCost(id)
      if (res?.error) {
        setGlobalMessage({ type: 'error', text: res.error })
      } else {
        setFixedCosts((prev) => prev.filter((item) => item.id !== id))
        setGlobalMessage({ type: 'success', text: `Biaya "${name}" berhasil dihapus.` })
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
            <Coins className="w-7 h-7 text-primary" />
            Biaya Tetap & Alokasi HPP
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Catat biaya sewa, listrik, gaji, serta penyusutan alat agar biaya modal per porsi terhitung akurat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalRutinOpen(true)}
            className="flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-2xl font-bold shadow-sm transition active:scale-95 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Biaya Rutin</span>
          </button>
          <button
            onClick={() => setIsModalAlatOpen(true)}
            className="flex items-center justify-center space-x-2 bg-surface-container hover:bg-surface-container-high text-slate-800 border border-surface-dim px-4 py-2.5 rounded-2xl font-bold transition active:scale-95 text-xs sm:text-sm cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-primary" />
            <span>+ Penyusutan Alat</span>
          </button>
        </div>
      </div>

      {/* 3 Summary Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Biaya Tetap */}
        <div className="bg-surface-container p-5 rounded-3xl border border-surface-dim">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-slate-500 bg-surface-container-high px-2.5 py-1 rounded-full">
              Per Bulan
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 font-bold">Total Biaya Tetap Bulanan</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {formatRupiah(totalFixedMonthly)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Rutin: {formatRupiah(totalRutin)} • Alat: {formatRupiah(totalPenyusutan)}
            </p>
          </div>
        </div>

        {/* Card 2: Target Penjualan Bulanan */}
        <div className="bg-surface-container p-5 rounded-3xl border border-surface-dim">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
              <Target className="w-6 h-6" />
            </div>
            {!isEditingTarget ? (
              <button
                onClick={() => {
                  setTempTargetSales(targetSales.toString())
                  setIsEditingTarget(true)
                }}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Ubah Target
              </button>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={handleSaveTarget}
                  disabled={isPending}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                  title="Simpan"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingTarget(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Batal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-500 font-bold">Target Penjualan Produk</p>
            {!isEditingTarget ? (
              <p className="text-2xl font-black text-foreground mt-1">
                {targetSales.toLocaleString('id-ID')} <span className="text-sm font-bold text-slate-500">porsi / bulan</span>
              </p>
            ) : (
              <div className="mt-1 flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={tempTargetSales}
                  onChange={(e) => setTempTargetSales(e.target.value)}
                  className="w-28 px-3 py-1 bg-surface rounded-xl border border-primary text-base font-bold focus:outline-none"
                />
                <span className="text-xs text-slate-500 font-bold">porsi</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Estimasi: ~{Math.round(targetSales / 30)} porsi per hari
            </p>
          </div>
        </div>

        {/* Card 3: Beban Tetap per Porsi (Otomatis masuk HPP) */}
        <div className="bg-primary/5 p-5 rounded-3xl border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="p-3 bg-primary text-white rounded-2xl shadow-xs">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-extrabold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
              Alokasi HPP
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs text-slate-600 font-bold">Beban Tetap per Porsi Produk</p>
            <p className="text-2xl font-black text-primary mt-1">
              {formatRupiah(fixedPerUnit)} <span className="text-xs font-bold text-slate-500">/ porsi</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Otomatis dibebankan ke kalkulator HPP semua produk.
            </p>
          </div>
        </div>
      </div>

      {/* Daftar Biaya Tetap */}
      <div className="bg-surface-container rounded-3xl border border-surface-dim overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-surface-dim flex items-center justify-between">
          <h3 className="font-extrabold text-foreground text-sm flex items-center gap-2">
            <span>Rincian Biaya Tetap & Penyusutan Alat</span>
            <span className="text-xs bg-surface-container-high text-slate-600 px-2 py-0.5 rounded-full font-bold">
              {fixedCosts.length} item
            </span>
          </h3>
        </div>

        {fixedCosts.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Coins className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-foreground">Belum ada biaya tetap yang dicatat</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Tambahkan biaya sewa booth, listrik, gaji pegawai, atau penyusutan mesin blender/kopi Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high/60 border-b border-surface-dim text-slate-600 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Nama Beban / Aset</th>
                  <th className="px-5 py-3.5">Tipe Biaya</th>
                  <th className="px-5 py-3.5">Nominal per Bulan</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-dim font-medium">
                {fixedCosts.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-high/30 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        {item.type === 'penyusutan' ? (
                          <Wrench className="w-4 h-4 text-blue-500 shrink-0" />
                        ) : (
                          <Building className="w-4 h-4 text-primary shrink-0" />
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {item.type === 'penyusutan' ? (
                        <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-700 font-bold text-xs border border-blue-500/20">
                          Penyusutan Alat
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                          Operasional Rutin
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-800">
                      {formatRupiah(item.amount)}
                      <span className="text-xs text-slate-500 font-normal"> / bln</span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCost(item.id, item.name)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                        title="Hapus Biaya"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Biaya Rutin Bulanan */}
      {isModalRutinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 shadow-2xl border border-surface-dim">
            <div className="flex items-center justify-between pb-4 border-b border-surface-dim">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Building className="w-5 h-5 text-primary" />
                Tambah Biaya Rutin Bulanan
              </h3>
              <button
                onClick={() => setIsModalRutinOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formRutinError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formRutinError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRutin} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Biaya Rutin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sewa Lapak / Booth, Listrik & Air, Gaji Kasir"
                  value={formRutinName}
                  onChange={(e) => setFormRutinName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nominal Biaya per Bulan (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 500000"
                  value={formRutinAmount}
                  onChange={(e) => setFormRutinAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-surface-dim">
                <button
                  type="button"
                  onClick={() => setIsModalRutinOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Biaya</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Kalkulator Penyusutan Alat */}
      {isModalAlatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-surface rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-surface-dim overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-surface-dim">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Kalkulator Penyusutan Alat / Aset
              </h3>
              <button
                onClick={() => setIsModalAlatOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formAlatError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formAlatError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAlat} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Alat / Mesin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Mesin Espresso, Cup Sealer, Blender"
                  value={formAlatName}
                  onChange={(e) => setFormAlatName(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Beli Alat (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 3600000"
                    value={formAlatPrice}
                    onChange={(e) => setFormAlatPrice(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estimasi Nilai Sisa/Jual (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 600000 (0 jika habis)"
                    value={formAlatSalvage}
                    onChange={(e) => setFormAlatSalvage(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimasi Umur Pakai (Bulan) <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1 Tahun', val: '12' },
                    { label: '2 Tahun', val: '24' },
                    { label: '3 Tahun', val: '36' },
                    { label: '5 Tahun', val: '60' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFormAlatMonths(preset.val)}
                      className={`px-2 py-2 rounded-xl text-xs font-bold border text-center transition cursor-pointer ${
                        formAlatMonths === preset.val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-surface-container text-slate-700 border-surface-dim hover:border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ketik jumlah bulan..."
                  value={formAlatMonths}
                  onChange={(e) => setFormAlatMonths(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 bg-surface-container rounded-xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                />
              </div>

              {/* Live Preview Hasil Penyusutan per Bulan */}
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-600">Beban Penyusutan per Bulan:</p>
                  <p className="text-lg font-extrabold text-blue-700">
                    {formatRupiah(liveAlatDepreciation)} <span className="text-xs font-normal">/ bulan</span>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 max-w-[170px]">
                  Rumus: (Harga Beli - Nilai Sisa) / Umur Bulan
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-surface-dim">
                <button
                  type="button"
                  onClick={() => setIsModalAlatOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Penyusutan</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
