import React from 'react'
import { getProducts } from '@/actions/product'
import { getCategories } from '@/actions/category'
import { getStore } from '@/actions/store'
import { redirect } from 'next/navigation'
import KasirClient from './KasirClient'

export const metadata = {
  title: 'Kasir POS - POS UMKM',
  description: 'Kelola transaksi penjualan secara langsung dengan kasir digital terintegrasi.',
}

export default async function KasirPage() {
  const [products, categories, store] = await Promise.all([
    getProducts(),
    getCategories(),
    getStore(),
  ])

  if (!store) {
    redirect('/store/create')
  }

  return (
    <KasirClient
      initialProducts={products}
      categories={categories}
      store={store}
    />
  )
}
