import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  TrendingUp,
  CreditCard,
  Package,
  DollarSign,
  AlertTriangle,
  Receipt,
  ArrowUpRight,
  ShoppingCart,
  ShoppingBag
} from 'lucide-react'
import Link from 'next/link'

// Helper format Rupiah
const formatRupiah = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export const metadata = {
  title: 'Dashboard - POS UMKM',
  description: 'Ringkasan penjualan, transaksi, dan status stok toko Anda.',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Get store info
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!store) {
    redirect('/store/create')
  }

  // Waktu awal hari ini (00:00:00)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartISO = todayStart.toISOString()

  // 3. Fetch transactions today
  const { data: transactionsToday } = await supabase
    .from('transactions')
    .select('id, total_amount, status')
    .eq('store_id', store.id)
    .eq('status', 'COMPLETED')
    .gte('created_at', todayStartISO)

  // 4. Fetch total transactions count today
  const countTransactionsToday = transactionsToday?.length || 0

  // 5. Fetch total sales amount today
  const salesToday = transactionsToday?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0

  // 6. Fetch products sold today (via transaction items)
  let itemsSoldToday = 0
  if (transactionsToday && transactionsToday.length > 0) {
    const transactionIds = transactionsToday.map(t => t.id)
    const { data: items } = await supabase
      .from('transaction_items')
      .select('quantity')
      .in('transaction_id', transactionIds)
    
    itemsSoldToday = items?.reduce((acc, curr) => acc + curr.quantity, 0) || 0
  }

  // 7. Fetch all completed transactions (for total lifetime income)
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('total_amount')
    .eq('store_id', store.id)
    .eq('status', 'COMPLETED')
  
  const totalRevenue = allTransactions?.reduce((acc, curr) => acc + Number(curr.total_amount), 0) || 0

  // 8. Fetch low stock products (stock <= 5 and stock not null)
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .not('stock', 'is', null)
    .lte('stock', 5)
    .order('stock', { ascending: true })

  // 9. Fetch recent 5 transactions
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select('*, transaction_items(*)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Ringkasan Toko</h1>
          <p className="text-slate-500 mt-1">
            Selamat datang kembali di <span className="font-bold text-primary">{store.name}</span>. Berikut perkembangan toko Anda hari ini.
          </p>
        </div>
        <div>
          <Link
            href="/kasir"
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-container text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-primary/10 transition active:scale-[0.98] text-sm cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span>Buka Kasir</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sales Today */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 relative overflow-hidden transition duration-300 hover:border-primary/45 shadow-sm shadow-slate-100">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Penjualan Hari Ini</span>
              <h3 className="text-2xl font-black text-foreground">{formatRupiah(salesToday)}</h3>
            </div>
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Transactions Today */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 relative overflow-hidden transition duration-300 hover:border-blue-500/40 shadow-sm shadow-slate-100">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Transaksi Hari Ini</span>
              <h3 className="text-2xl font-black text-foreground">{countTransactionsToday} Transaksi</h3>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Items Sold Today */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 relative overflow-hidden transition duration-300 hover:border-purple-500/40 shadow-sm shadow-slate-100">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Produk Terjual Hari Ini</span>
              <h3 className="text-2xl font-black text-foreground">{itemsSoldToday} Unit</h3>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Total Income */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 relative overflow-hidden transition duration-300 hover:border-amber-500/40 shadow-sm shadow-slate-100">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Total Pendapatan</span>
              <h3 className="text-2xl font-black text-foreground">{formatRupiah(totalRevenue)}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 bg-surface border border-surface-dim rounded-3xl p-6 flex flex-col space-y-6 shadow-sm shadow-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-extrabold text-foreground">Transaksi Terbaru</h2>
            </div>
            <Link
              href="/transaksi"
              className="text-xs font-bold text-primary hover:text-primary-container flex items-center space-x-1 transition"
            >
              <span>Semua Riwayat</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-surface-dim flex-1">
            {recentTransactions && recentTransactions.length > 0 ? (
              recentTransactions.map((trx) => (
                <div key={trx.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-slate-800">{trx.transaction_number}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(trx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' • '}
                      <span className="font-semibold text-slate-600">
                        {trx.payment_method === 'CASH' ? 'Tunai' : 'QRIS'}
                      </span>
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-extrabold text-sm text-primary">{formatRupiah(trx.total_amount)}</p>
                    <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {trx.status === 'COMPLETED' ? 'Selesai' : trx.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Receipt className="w-12 h-12 text-slate-300" />
                <p className="text-sm">Belum ada transaksi hari ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Widget (1 col) */}
        <div className="bg-surface border border-surface-dim rounded-3xl p-6 flex flex-col space-y-6 shadow-sm shadow-slate-100">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-foreground">Stok Rendah</h2>
          </div>

          <div className="flex-1 divide-y divide-surface-dim">
            {lowStockProducts && lowStockProducts.length > 0 ? (
              lowStockProducts.map((product) => (
                <div key={product.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{product.name}</h4>
                    <p className="text-xs text-slate-500">Harga: {formatRupiah(product.price)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                      product.stock === 0
                        ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    }`}>
                      {product.stock === 0 ? 'Habis' : `Stok: ${product.stock}`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Package className="w-12 h-12 text-slate-300" />
                <p className="text-sm text-center">Stok semua produk aman atau tidak dilacak.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
