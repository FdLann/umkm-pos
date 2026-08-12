import React from 'react'
import { getTransactions, getDailyRekap, getMonthlyRekap } from '@/actions/transaction'
import { getStore } from '@/actions/store'
import { redirect } from 'next/navigation'
import TransaksiClient from './TransaksiClient'

export const metadata = {
  title: 'Riwayat Transaksi - POS UMKM',
  description: 'Lihat daftar transaksi kasir, detail belanjaan, dan cetak ulang struk pembayaran.',
}

export default async function TransaksiPage() {
  const [transactions, store, dailyRekap, monthlyRekap] = await Promise.all([
    getTransactions(),
    getStore(),
    getDailyRekap(),
    getMonthlyRekap()
  ])

  if (!store) {
    redirect('/store/create')
  }

  // Casting transactions database data to expected components type
  const castedTransactions = (transactions || []).map((t: any) => ({
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

  return (
    <TransaksiClient
      initialTransactions={castedTransactions}
      storeName={store.name}
      storeDescription={store.description}
      storeId={store.id}
      initialDailyRekap={dailyRekap || []}
      initialMonthlyRekap={monthlyRekap || []}
    />
  )
}
