'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { resetCurrentMonthTransactions } from '@/actions/transaction'
import {
  Search,
  Filter,
  History,
  Calendar,
  DollarSign,
  QrCode,
  Printer,
  X,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Check,
  TrendingUp,
  Download
} from 'lucide-react'

interface TransactionItem {
  id: string
  product_name_snapshot: string
  price_snapshot: number
  quantity: number
  subtotal: number
}

interface Transaction {
  id: string
  transaction_number: string
  total_amount: number
  payment_method: 'CASH' | 'QRIS'
  paid_amount: number
  change_amount: number
  status: string
  created_at: string
  transaction_items: TransactionItem[]
}

interface DailyRekapItem {
  rekap_date: string
  transaction_count: number
  total_revenue: number
}

interface MonthlyRekapItem {
  rekap_month: string
  transaction_count: number
  total_revenue: number
}

interface TransaksiClientProps {
  initialTransactions: Transaction[]
  storeName: string
  storeDescription: string | null
  storeId: string
  initialDailyRekap: DailyRekapItem[]
  initialMonthlyRekap: MonthlyRekapItem[]
}

export default function TransaksiClient({
  initialTransactions,
  storeName,
  storeDescription,
  storeId,
  initialDailyRekap,
  initialMonthlyRekap
}: TransaksiClientProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<'list' | 'rekap'>('list')
  const [rekapSubTab, setRekapSubTab] = useState<'daily' | 'monthly'>('daily')

  // Transactions list pagination states
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [hasMore, setHasMore] = useState(initialTransactions.length === 50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'QRIS'>('ALL')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Rekap Data states
  const [dailyRekap, setDailyRekap] = useState<DailyRekapItem[]>(initialDailyRekap)
  const [monthlyRekap, setMonthlyRekap] = useState<MonthlyRekapItem[]>(initialMonthlyRekap)

  // Reset Current Month States
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null)
  const [isPending, startTransition] = useTransition()

  // Client-Side filter (hanya untuk pencarian kode & metode pembayaran di dalam transaksi yang termuat)
  const displayTransactions = transactions.filter((trx) => {
    const matchesSearch = trx.transaction_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = methodFilter === 'ALL' || trx.payment_method === methodFilter
    return matchesSearch && matchesMethod
  })

  // Trigger search / filter dengan range tanggal via Database (Server-Side)
  const handleApplyDateFilters = async () => {
    setIsLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      const dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
      query = query.lte('created_at', dateEnd.toISOString())
    }

    const { data, error } = await query.range(0, 49)
    if (error) {
      console.error(error)
    } else if (data) {
      const casted = data.map((t: any) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total_amount: Number(t.total_amount),
        payment_method: t.payment_method,
        paid_amount: Number(t.paid_amount),
        change_amount: Number(t.change_amount),
        status: t.status,
        created_at: t.created_at,
        transaction_items: (t.transaction_items || []).map((item: any) => ({
          id: item.id,
          product_name_snapshot: item.product_name_snapshot,
          price_snapshot: Number(item.price_snapshot),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        })),
      }))
      setTransactions(casted)
      setHasMore(casted.length === 50)
    }
    setIsLoading(false)
  }

  // Load More function
  const handleLoadMore = async () => {
    if (isLoadingMore) return
    setIsLoadingMore(true)
    const nextOffset = transactions.length
    const supabase = createClient()

    let query = supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString())
    }
    if (endDate) {
      const dateEnd = new Date(endDate)
      dateEnd.setHours(23, 59, 59, 999)
      query = query.lte('created_at', dateEnd.toISOString())
    }

    const { data, error } = await query.range(nextOffset, nextOffset + 49)
    if (error) {
      console.error(error)
    } else if (data) {
      const casted = data.map((t: any) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total_amount: Number(t.total_amount),
        payment_method: t.payment_method,
        paid_amount: Number(t.paid_amount),
        change_amount: Number(t.change_amount),
        status: t.status,
        created_at: t.created_at,
        transaction_items: (t.transaction_items || []).map((item: any) => ({
          id: item.id,
          product_name_snapshot: item.product_name_snapshot,
          price_snapshot: Number(item.price_snapshot),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        })),
      }))

      if (casted.length < 50) {
        setHasMore(false)
      }
      setTransactions([...transactions, ...casted])
    }
    setIsLoadingMore(false)
  }

  // Reset filter tanggal
  const handleResetDateFilters = async () => {
    setStartDate('')
    setEndDate('')
    setIsLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('store_id', storeId)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .range(0, 49)

    if (error) {
      console.error(error)
    } else if (data) {
      const casted = data.map((t: any) => ({
        id: t.id,
        transaction_number: t.transaction_number,
        total_amount: Number(t.total_amount),
        payment_method: t.payment_method,
        paid_amount: Number(t.paid_amount),
        change_amount: Number(t.change_amount),
        status: t.status,
        created_at: t.created_at,
        transaction_items: (t.transaction_items || []).map((item: any) => ({
          id: item.id,
          product_name_snapshot: item.product_name_snapshot,
          price_snapshot: Number(item.price_snapshot),
          quantity: Number(item.quantity),
          subtotal: Number(item.subtotal),
        })),
      }))
      setTransactions(casted)
      setHasMore(casted.length === 50)
    }
    setIsLoading(false)
  }

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleReprint = () => {
    window.print()
  }

  // Export Semua Transaksi (Filtered) ke CSV
  const exportToCSV = () => {
    if (displayTransactions.length === 0) return

    const headers = ['No. Transaksi', 'Tanggal', 'Waktu', 'Metode Pembayaran', 'Total Belanja', 'Status']
    const rows = displayTransactions.map((trx) => {
      const date = new Date(trx.created_at)
      const formattedDate = date.toLocaleDateString('id-ID')
      const formattedTime = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      return [
        trx.transaction_number,
        formattedDate,
        formattedTime,
        trx.payment_method === 'CASH' ? 'Tunai' : 'QRIS',
        trx.total_amount,
        trx.status
      ]
    })

    const csvContent = [headers, ...rows]
      .map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `laporan_transaksi_${storeName.toLowerCase().replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Rekap Bulanan / Harian ke CSV
  const exportRekapToCSV = (type: 'daily' | 'monthly') => {
    const data = type === 'daily' ? dailyRekap : monthlyRekap
    if (data.length === 0) return

    const headers = type === 'daily'
      ? ['Tanggal', 'Jumlah Transaksi', 'Total Pendapatan']
      : ['Bulan (Tahun-Bulan)', 'Jumlah Transaksi', 'Total Pendapatan']

    const rows = data.map((item: any) => [
      type === 'daily' ? item.rekap_date : item.rekap_month,
      item.transaction_count,
      item.total_revenue
    ])

    const csvContent = [headers, ...rows]
      .map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `rekap_penjualan_${type}_${storeName.toLowerCase().replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Reset Transaksi Bulan Ini
  const handleResetCurrentMonth = () => {
    setResetError(null)
    setResetSuccess(null)
    if (resetConfirmText !== storeName) {
      setResetError('Nama toko tidak cocok.')
      return
    }

    startTransition(async () => {
      const res = await resetCurrentMonthTransactions()
      if (res.error) {
        setResetError(res.error)
      } else {
        setResetSuccess('Semua data transaksi bulan ini berhasil dihapus.')
        setIsResetConfirmOpen(false)
        setResetConfirmText('')
        setTimeout(() => window.location.reload(), 1000)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Tab Selector & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-dim pb-4 no-print">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Laporan Penjualan</h1>
          <p className="text-slate-500 mt-1">Pantau riwayat struk kasir dan agregasi laporan bulanan toko.</p>
        </div>
        <div className="flex bg-slate-100 border border-surface-dim p-1 rounded-2xl shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'list' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Semua Transaksi</span>
          </button>
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
              activeTab === 'rekap' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Rekap Bulanan/Harian</span>
          </button>
        </div>
      </div>

      {/* ========================================================
         TAB 1: SEMUA TRANSAKSI (DAFTAR STRUK)
         ======================================================== */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Search, Filter & Date Range - Hidden on Print */}
          <div className="bg-surface border border-surface-dim p-5 rounded-3xl space-y-4 shadow-sm shadow-slate-100 no-print">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nomor transaksi (misal: TRX-2026...)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 pl-11 pr-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
                />
              </div>
              {/* Export CSV button */}
              <button
                onClick={exportToCSV}
                disabled={displayTransactions.length === 0}
                className="bg-primary hover:bg-primary-container text-white px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer shadow-md shadow-primary/10"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Unduh Data Tampil (CSV)</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 pt-3 border-t border-slate-100">
              {/* Payment Method filter */}
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Metode:</span>
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value as any)}
                  className="bg-white border border-surface-dim text-slate-700 rounded-2xl py-2.5 px-4 text-xs focus:border-primary outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Pembayaran</option>
                  <option value="CASH">Tunai</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              {/* Date range inputs */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-surface-dim text-slate-700 rounded-2xl py-2 px-3 text-xs focus:border-primary outline-none cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Hingga:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-surface-dim text-slate-700 rounded-2xl py-2 px-3 text-xs focus:border-primary outline-none cursor-pointer"
                />
                <div className="flex gap-2 shrink-0 mt-2 sm:mt-0">
                  <button
                    onClick={handleApplyDateFilters}
                    disabled={isLoading || (!startDate && !endDate)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition cursor-pointer disabled:opacity-50"
                  >
                    Terapkan
                  </button>
                  {(startDate || endDate) && (
                    <button
                      onClick={handleResetDateFilters}
                      disabled={isLoading}
                      className="text-xs font-bold text-rose-600 hover:underline shrink-0 pl-1 cursor-pointer flex items-center space-x-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-surface border border-surface-dim rounded-3xl overflow-hidden shadow-sm shadow-slate-100 no-print">
            <div className="overflow-x-auto">
              {displayTransactions.length > 0 ? (
                <div className="flex flex-col">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 border-b border-surface-dim text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">No. Transaksi</th>
                        <th className="py-4 px-6">Tanggal & Waktu</th>
                        <th className="py-4 px-6">Metode</th>
                        <th className="py-4 px-6">Total Belanja</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-dim text-slate-700">
                      {displayTransactions.map((trx) => (
                        <tr key={trx.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 font-bold text-slate-800">{trx.transaction_number}</td>
                          <td className="py-4 px-6">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>
                                {new Date(trx.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="flex items-center space-x-1.5 font-semibold">
                              {trx.payment_method === 'CASH' ? (
                                <>
                                  <DollarSign className="w-4 h-4 text-emerald-600" />
                                  <span>Tunai</span>
                                </>
                              ) : (
                                <>
                                  <QrCode className="w-4 h-4 text-blue-600" />
                                  <span>QRIS</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-extrabold text-primary">{formatRupiah(trx.total_amount)}</td>
                          <td className="py-4 px-6">
                            <span className="inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {trx.status === 'COMPLETED' ? 'Selesai' : trx.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => setSelectedTrx(trx)}
                              className="inline-flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Load More Button */}
                  {hasMore && (
                    <div className="p-4 bg-slate-50 border-t border-surface-dim flex justify-center">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="px-6 py-2.5 bg-white border border-surface-dim hover:bg-slate-55 rounded-2xl text-xs font-bold text-slate-700 flex items-center space-x-2 transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
                      >
                        {isLoadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                            <span>Memuat...</span>
                          </>
                        ) : (
                          <span>Muat Lebih Banyak</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <History className="w-16 h-16 text-slate-300" />
                  <p className="text-sm">Tidak ada riwayat transaksi yang ditemukan.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
         TAB 2: REKAP PENJUALAN (DAILY / MONTHLY SUMMARIES)
         ======================================================== */}
      {activeTab === 'rekap' && (
        <div className="space-y-6 no-print">
          {/* Sub Tab & Export controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-surface-dim p-4 rounded-3xl shadow-sm shadow-slate-100">
            <div className="flex bg-slate-100 border border-surface-dim p-1 rounded-xl shrink-0">
              <button
                onClick={() => setRekapSubTab('daily')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  rekapSubTab === 'daily' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Harian
              </button>
              <button
                onClick={() => setRekapSubTab('monthly')}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer ${
                  rekapSubTab === 'monthly' ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rekap Bulanan
              </button>
            </div>

            <button
              onClick={() => exportRekapToCSV(rekapSubTab)}
              disabled={(rekapSubTab === 'daily' ? dailyRekap : monthlyRekap).length === 0}
              className="bg-primary hover:bg-primary-container text-white px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-md shadow-primary/10 shrink-0"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Ekspor Rekap ({rekapSubTab === 'daily' ? 'Hari' : 'Bulan'})</span>
            </button>
          </div>

          {/* Rekap Tables */}
          <div className="bg-surface border border-surface-dim rounded-3xl overflow-hidden shadow-sm shadow-slate-100">
            {rekapSubTab === 'daily' ? (
              <div className="overflow-x-auto">
                {dailyRekap.length > 0 ? (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 border-b border-surface-dim text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Tanggal</th>
                        <th className="py-4 px-6">Jumlah Transaksi</th>
                        <th className="py-4 px-6">Total Pendapatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-dim text-slate-700">
                      {dailyRekap.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition">
                          <td className="py-4 px-6 font-bold text-slate-800">
                            {new Date(item.rekap_date).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-4 px-6 font-semibold">{item.transaction_count} Transaksi</td>
                          <td className="py-4 px-6 font-extrabold text-primary">{formatRupiah(Number(item.total_revenue))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <TrendingUp className="w-16 h-16 text-slate-300" />
                    <p className="text-sm">Belum ada data rekap penjualan harian.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                {monthlyRekap.length > 0 ? (
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-slate-50 border-b border-surface-dim text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Bulan</th>
                        <th className="py-4 px-6">Jumlah Transaksi</th>
                        <th className="py-4 px-6">Total Pendapatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-dim text-slate-700">
                      {monthlyRekap.map((item, idx) => {
                        const [year, month] = item.rekap_month.split('-')
                        const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-4 px-6 font-bold text-slate-800">{monthName}</td>
                            <td className="py-4 px-6 font-semibold">{item.transaction_count} Transaksi</td>
                            <td className="py-4 px-6 font-extrabold text-primary">{formatRupiah(Number(item.total_revenue))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <TrendingUp className="w-16 h-16 text-slate-300" />
                    <p className="text-sm">Belum ada data rekap penjualan bulanan.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset Transaksi Bulan Ini (Danger Zone) */}
          <div className="bg-surface border border-rose-200 rounded-3xl p-6 md:p-8 shadow-sm shadow-rose-50/50 space-y-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-850">Zona Bahaya: Reset Data Transaksi Bulan Ini</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Menghapus semua data transaksi yang tercatat **sejak tanggal 1 bulan ini** secara permanen dari database. Pastikan Anda telah mengekspor rekapnya ke Excel.
                </p>
              </div>
            </div>

            {resetError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-primary text-sm font-semibold flex items-center space-x-2">
                <Check className="w-4 h-4 text-primary" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {isResetConfirmOpen ? (
              <div className="bg-slate-50 border border-surface-dim p-5 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-655 block">
                    Ketik nama toko Anda <span className="font-bold text-rose-600">"{storeName}"</span> untuk konfirmasi:
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
                    onClick={handleResetCurrentMonth}
                    disabled={isPending || resetConfirmText !== storeName}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? 'Mereset...' : 'Ya, Reset Transaksi Bulan Ini'}
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
                  Reset Transaksi Bulan Ini
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
         6. RECEIPT MODAL
         ======================================================== */}
      {selectedTrx && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-surface border border-surface-dim w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6 flex flex-col print:bg-white print:border-none print:shadow-none print:w-full print:max-w-none print:text-black print-container-card">
            
            <style>{`
              @media print {
                aside, header, nav, .no-print, button, form, .lg\\:flex, .flex-1 {
                  display: none !important;
                }
                body, html {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .fixed.inset-0 {
                  position: absolute !important;
                  inset: 0 !important;
                  background: white !important;
                  backdrop-filter: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .print-container-card {
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 auto !important;
                  width: 58mm !important;
                  max-width: 58mm !important;
                  box-sizing: border-box !important;
                }
                .print-struk {
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 9px !important;
                  line-height: 1.3 !important;
                  color: black !important;
                  width: 100% !important;
                  text-align: left !important;
                }
                .print-struk * {
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 9px !important;
                  color: black !important;
                }
                .print-center {
                  text-align: center !important;
                }
                .print-border-dashed {
                  border-top: 1px dashed black !important;
                  border-bottom: 1px dashed black !important;
                  border-style: dashed !important;
                  border-color: black !important;
                  border-left: none !important;
                  border-right: none !important;
                }
                .print-border-dashed-bottom {
                  border-bottom: 1px dashed black !important;
                  border-style: dashed !important;
                  border-color: black !important;
                  border-top: none !important;
                  border-left: none !important;
                  border-right: none !important;
                }
                @page {
                  margin: 0 !important;
                }
              }
            `}</style>

            <div className="print-struk space-y-5 text-center print-center">
              <div className="text-center print-center space-y-0.5 border-b border-dashed border-slate-200 print-border-dashed-bottom pb-4">
                <h3 className="font-extrabold text-base text-foreground uppercase">{storeName}</h3>
                <p className="text-xs text-slate-500">{storeDescription || 'Struk Kasir Digital'}</p>
              </div>

              <div className="space-y-4 text-left border-b border-dashed border-slate-200 print-border-dashed-bottom pb-5">
                <div className="space-y-1.5 text-xs text-slate-555">
                  <div className="flex justify-between">
                    <span>No. Transaksi:</span>
                    <span className="font-bold text-foreground">{selectedTrx.transaction_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu Transaksi:</span>
                    <span>
                      {new Date(selectedTrx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode Pembayaran:</span>
                    <span className="font-bold uppercase text-foreground">
                      {selectedTrx.payment_method === 'CASH' ? 'Tunai' : 'QRIS'}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3.5 text-xs pt-2">
                  {selectedTrx.transaction_items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-700 block truncate">{item.product_name_snapshot}</span>
                        <span className="text-slate-555 text-[10px]">
                          {item.quantity} × {formatRupiah(item.price_snapshot)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 text-right shrink-0">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="space-y-2 text-xs border-t border-dashed border-slate-200 print-border-dashed pt-4">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Belanja:</span>
                    <span className="text-sm text-primary">{formatRupiah(selectedTrx.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Dibayar:</span>
                    <span>{formatRupiah(selectedTrx.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(selectedTrx.change_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center print-center text-[10px] text-slate-455">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 no-print">
              <button
                type="button"
                onClick={handleReprint}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Ulang</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrx(null)}
                className="flex-1 bg-primary hover:bg-primary-container text-white font-black py-3 rounded-2xl text-sm transition active:scale-95 cursor-pointer shadow-md shadow-primary/10"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
