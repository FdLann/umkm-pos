'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function checkout(
  paymentMethod: 'CASH' | 'QRIS',
  paidAmount: number,
  items: { product_id: string; quantity: number }[]
) {
  if (items.length === 0) {
    return { error: 'Keranjang belanja kosong.' }
  }

  try {
    const supabase = await createClient()

    // 1. Dapatkan store_id milik pengguna
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesi kedaluwarsa. Silakan masuk kembali.' }

    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (storeError || !store) {
      return { error: 'Toko tidak ditemukan. Silakan buat toko terlebih dahulu.' }
    }

    // 2. Panggil PostgreSQL RPC function secara aman & atomik
    const { data: rpcResult, error: rpcError } = await supabase.rpc('checkout_transaction', {
      p_store_id: store.id,
      p_payment_method: paymentMethod,
      p_paid_amount: paidAmount,
      p_change_amount: 0, // Dihitung dinamis oleh fungsi SQL
      p_items: items
    })

    if (rpcError) {
      return { error: rpcError.message }
    }

    // Konversi hasil RPC
    const result = rpcResult as {
      success: boolean
      error?: string
      transaction_id?: string
      transaction_number?: string
      total_amount?: number
      change_amount?: number
    }

    if (!result.success) {
      return { error: result.error || 'Gagal memproses transaksi.' }
    }

    // 3. Ambil data struk detail lengkap beserta snapshot item belanja
    const { data: transactionDetails, error: detailsError } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('id', result.transaction_id)
      .single()

    if (detailsError) {
      return { error: 'Transaksi sukses, tetapi gagal memuat struk detail.' }
    }

    revalidatePath('/kasir')
    revalidatePath('/')
    revalidatePath('/transaksi')
    return { success: true, transaction: transactionDetails }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat memproses transaksi.' }
  }
}

export async function getTransactions() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return []

    const { data, error } = await supabase
      .from('transactions')
      .select('*, transaction_items(*)')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
      .range(0, 49)

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching transactions:', err)
    return []
  }
}

export async function resetTransactions() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesi kedaluwarsa. Silakan masuk kembali.' }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return { error: 'Toko tidak ditemukan.' }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('store_id', store.id)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/transaksi')
    revalidatePath('/')
    revalidatePath('/kasir')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat mereset data transaksi.' }
  }
}

export async function resetCurrentMonthTransactions() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Sesi kedaluwarsa. Silakan masuk kembali.' }

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return { error: 'Toko tidak ditemukan.' }

    // Dapatkan tanggal awal bulan ini di waktu lokal Wita/Wib/Wit
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfMonthISO = startOfMonth.toISOString()

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('store_id', store.id)
      .gte('created_at', startOfMonthISO)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/transaksi')
    revalidatePath('/')
    revalidatePath('/kasir')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan sistem saat mereset transaksi bulan ini.' }
  }
}

export async function getDailyRekap() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return []

    const { data, error } = await supabase.rpc('get_daily_rekap', {
      p_store_id: store.id
    })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error in getDailyRekap:', err)
    return []
  }
}

export async function getMonthlyRekap() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (!store) return []

    const { data, error } = await supabase.rpc('get_monthly_rekap', {
      p_store_id: store.id
    })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error in getMonthlyRekap:', err)
    return []
  }
}
