import React from 'react'
import { getProducts } from '@/actions/product'
import { getCategories } from '@/actions/category'
import { getStore } from '@/actions/store'
import { getIngredients } from '@/actions/ingredient'
import { getStorePricingSettings } from '@/actions/fixedCost'
import { redirect } from 'next/navigation'
import ProductClient from './ProductClient'

export const metadata = {
  title: 'Kelola Produk & Resep HPP - POS UMKM',
  description: 'Urus daftar harga, resep bahan baku, kalkulator HPP, stok, dan detail produk toko Anda.',
}

export default async function ProdukPage() {
  const [products, categories, store, ingredients, pricingSettings] = await Promise.all([
    getProducts(),
    getCategories(),
    getStore(),
    getIngredients(),
    getStorePricingSettings(),
  ])

  if (!store) {
    redirect('/store/create')
  }

  return (
    <ProductClient
      initialProducts={products}
      categories={categories}
      store={store}
      initialIngredients={ingredients}
      pricingSettings={pricingSettings}
    />
  )
}
