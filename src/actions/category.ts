'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getStoreId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak terautentikasi')

  const { data: store, error } = await supabase
    .from('stores')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (error || !store) throw new Error('Toko tidak ditemukan')
  return store.id
}

export async function getCategories() {
  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true })

    if (error) throw error
    return categories || []
  } catch (err: any) {
    console.error('getCategories error:', err)
    return []
  }
}

export async function createCategory(name: string) {
  if (!name || name.trim() === '') {
    return { error: 'Nama kategori wajib diisi.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('categories')
      .insert({
        store_id: storeId,
        name: name.trim(),
      })

    if (error) {
      if (error.code === '23505') {
        return { error: 'Kategori dengan nama ini sudah ada.' }
      }
      throw error
    }

    revalidatePath('/kategori')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menambahkan kategori.' }
  }
}

export async function updateCategory(id: string, name: string) {
  if (!id || !name || name.trim() === '') {
    return { error: 'Nama kategori wajib diisi.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('categories')
      .update({
        name: name.trim(),
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) {
      if (error.code === '23505') {
        return { error: 'Kategori dengan nama ini sudah ada.' }
      }
      throw error
    }

    revalidatePath('/kategori')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal mengubah kategori.' }
  }
}

export async function deleteCategory(id: string) {
  if (!id) {
    return { error: 'ID kategori tidak valid.' }
  }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    revalidatePath('/kategori')
    revalidatePath('/produk')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menghapus kategori.' }
  }
}
