import React from 'react'
import { getProducts } from '@/actions/product'
import { getCategories } from '@/actions/category'
import { getStore } from '@/actions/store'
import { redirect } from 'next/navigation'
import ProductClient from './ProductClient'

export const metadata = {
  title: 'Kelola Produk - POS UMKM',
  description: 'Urus daftar harga, stok, gambar, dan detail produk dagangan toko Anda.',
}

export default async function ProdukPage() {
  const [products, categories, store] = await Promise.all([
    getProducts(),
    getCategories(),
    getStore(),
  ])

  if (!store) {
    redirect('/store/create')
  }

  return (
    <ProductClient
      initialProducts={products}
      categories={categories}
      store={store}
    />
  )
}
