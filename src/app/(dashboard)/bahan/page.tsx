import React from 'react'
import { getIngredients } from '@/actions/ingredient'
import BahanClient from './BahanClient'

export const metadata = {
  title: 'Bahan Baku & Harga Modal | POS UMKM',
  description: 'Kelola inventori bahan baku dan hitung harga per unit secara otomatis.',
}

export default async function BahanPage() {
  const initialIngredients = await getIngredients()

  return <BahanClient initialIngredients={initialIngredients} />
}
