'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveStoreId, getCurrentStore } from '@/lib/supabase/authStore'
import { revalidatePath } from 'next/cache'

export interface FixedCostData {
  id: string
  store_id: string
  name: string
  amount: number
  type: 'bulanan' | 'penyusutan'
  created_at: string
}

export interface StorePricingSettings {
  storeId: string
  targetMonthlySales: number
  totalMonthlyFixedCost: number
}

export async function getFixedCosts(): Promise<FixedCostData[]> {
  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((item) => ({
      ...item,
      amount: Number(item.amount) || 0,
    }))
  } catch (err) {
    console.error('getFixedCosts error:', err)
    return []
  }
}

export async function createFixedCost(input: {
  name: string
  amount: number
  type: 'bulanan' | 'penyusutan'
}) {
  if (!input.name || input.name.trim() === '') {
    return { error: 'Nama biaya tetap wajib diisi.' }
  }
  if (input.amount <= 0) {
    return { error: 'Nominal biaya harus lebih dari 0.' }
  }
  if (!['bulanan', 'penyusutan'].includes(input.type)) {
    return { error: 'Tipe biaya tidak valid.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('fixed_costs')
      .insert({
        store_id: storeId,
        name: input.name.trim(),
        amount: input.amount,
        type: input.type,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/biaya-operasional')
    revalidatePath('/produk')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Gagal menambahkan biaya tetap.' }
  }
}

export async function deleteFixedCost(id: string) {
  if (!id) return { error: 'ID biaya tidak valid.' }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { error } = await supabase
      .from('fixed_costs')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    revalidatePath('/biaya-operasional')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menghapus biaya.' }
  }
}

export async function getStorePricingSettings(): Promise<StorePricingSettings> {
  try {
    const store = await getCurrentStore()
    if (!store) {
      return { storeId: '', targetMonthlySales: 500, totalMonthlyFixedCost: 0 }
    }

    const targetMonthlySales = Math.max(1, Number(store.target_monthly_sales) || 500)

    const supabase = await createClient()
    const { data: costs } = await supabase
      .from('fixed_costs')
      .select('amount')
      .eq('store_id', store.id)

    const totalMonthlyFixedCost = (costs || []).reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )

    return {
      storeId: store.id,
      targetMonthlySales,
      totalMonthlyFixedCost,
    }
  } catch (err) {
    console.error('getStorePricingSettings error:', err)
    return {
      storeId: '',
      targetMonthlySales: 500,
      totalMonthlyFixedCost: 0,
    }
  }
}

export async function updateTargetMonthlySales(target: number) {
  const safeTarget = Math.max(1, Math.round(Number(target) || 500))

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { error } = await supabase
      .from('stores')
      .update({
        target_monthly_sales: safeTarget,
      })
      .eq('id', storeId)

    if (error) throw error

    revalidatePath('/biaya-operasional')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal memperbarui target penjualan.' }
  }
}
