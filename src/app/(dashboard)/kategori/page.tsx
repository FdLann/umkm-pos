import React from 'react'
import { getCategories } from '@/actions/category'
import CategoryClient from './CategoryClient'

export const metadata = {
  title: 'Kategori Produk - POS UMKM',
  description: 'Kelola kategori produk toko/warung Anda.',
}

export default async function KategoriPage() {
  const categories = await getCategories()

  return <CategoryClient initialCategories={categories} />
}
