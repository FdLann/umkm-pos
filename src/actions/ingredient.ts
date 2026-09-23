'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveStoreId } from '@/lib/supabase/authStore'
import { revalidatePath } from 'next/cache'

export interface IngredientInput {
  name: string
  unit: string
  purchasePrice: number
  purchaseQty: number
  stock?: number
  minStock?: number
  trackStock?: boolean
}

export interface IngredientData {
  id: string
  store_id: string
  name: string
  unit: string
  purchase_price: number
  purchase_qty: number
  cost_per_unit: number
  stock: number
  min_stock: number
  track_stock: boolean
  created_at: string
  updated_at: string
}

export async function getIngredients(): Promise<IngredientData[]> {
  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('getIngredients error:', err)
    return []
  }
}

export async function createIngredient(input: IngredientInput) {
  if (!input.name || input.name.trim() === '') {
    return { error: 'Nama bahan baku wajib diisi.' }
  }
  if (!input.unit || input.unit.trim() === '') {
    return { error: 'Satuan unit wajib dipilih/diisi.' }
  }
  if (input.purchasePrice < 0) {
    return { error: 'Harga beli tidak boleh kurang dari 0.' }
  }
  if (!input.purchaseQty || input.purchaseQty <= 0) {
    return { error: 'Isi per kemasan harus lebih dari 0.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        store_id: storeId,
        name: input.name.trim(),
        unit: input.unit.trim().toLowerCase(),
        purchase_price: input.purchasePrice,
        purchase_qty: input.purchaseQty,
        stock: input.stock !== undefined ? Math.max(0, input.stock) : 0,
        min_stock: input.minStock !== undefined ? Math.max(0, input.minStock) : 0,
        track_stock: !!input.trackStock,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/bahan')
    revalidatePath('/produk')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Gagal menambahkan bahan baku.' }
  }
}

export async function updateIngredient(id: string, input: IngredientInput) {
  if (!id) return { error: 'ID bahan tidak valid.' }
  if (!input.name || input.name.trim() === '') {
    return { error: 'Nama bahan baku wajib diisi.' }
  }
  if (!input.unit || input.unit.trim() === '') {
    return { error: 'Satuan unit wajib dipilih/diisi.' }
  }
  if (input.purchasePrice < 0) {
    return { error: 'Harga beli tidak boleh kurang dari 0.' }
  }
  if (!input.purchaseQty || input.purchaseQty <= 0) {
    return { error: 'Isi per kemasan harus lebih dari 0.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('ingredients')
      .update({
        name: input.name.trim(),
        unit: input.unit.trim().toLowerCase(),
        purchase_price: input.purchasePrice,
        purchase_qty: input.purchaseQty,
        stock: input.stock !== undefined ? Math.max(0, input.stock) : 0,
        min_stock: input.minStock !== undefined ? Math.max(0, input.minStock) : 0,
        track_stock: !!input.trackStock,
      })
      .eq('id', id)
      .eq('store_id', storeId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/bahan')
    revalidatePath('/produk')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Gagal mengubah bahan baku.' }
  }
}

export async function deleteIngredient(id: string) {
  if (!id) return { error: 'ID bahan tidak valid.' }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    revalidatePath('/bahan')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menghapus bahan baku.' }
  }
}
