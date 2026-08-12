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

export async function getProducts() {
  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { data: products, error } = await supabase
      .from('products')
      .select('*, categories(id, name)')
      .eq('store_id', storeId)
      .order('name', { ascending: true })

    if (error) throw error
    return products || []
  } catch (err) {
    console.error('getProducts error:', err)
    return []
  }
}

export async function createProduct(formData: {
  name: string
  description?: string
  price: number
  stock: number | null
  categoryId?: string | null
  imageUrl?: string | null
}) {
  if (!formData.name) return { error: 'Nama produk wajib diisi.' }
  if (formData.price < 0) return { error: 'Harga produk tidak boleh kurang dari 0.' }
  if (formData.stock !== null && formData.stock < 0) return { error: 'Stok tidak boleh kurang dari 0.' }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        category_id: formData.categoryId || null,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        stock: formData.stock,
        image_url: formData.imageUrl || null,
        is_active: true
      })

    if (error) throw error

    revalidatePath('/produk')
    revalidatePath('/kasir')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menambahkan produk.' }
  }
}

export async function updateProduct(
  id: string,
  formData: {
    name: string
    description?: string
    price: number
    stock: number | null
    categoryId?: string | null
    imageUrl?: string | null
  }
) {
  if (!id) return { error: 'ID produk tidak valid.' }
  if (!formData.name) return { error: 'Nama produk wajib diisi.' }
  if (formData.price < 0) return { error: 'Harga produk tidak boleh kurang dari 0.' }
  if (formData.stock !== null && formData.stock < 0) return { error: 'Stok tidak boleh kurang dari 0.' }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    const { error } = await supabase
      .from('products')
      .update({
        category_id: formData.categoryId || null,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        stock: formData.stock,
        image_url: formData.imageUrl || null,
      })
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    revalidatePath('/produk')
    revalidatePath('/kasir')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal mengubah produk.' }
  }
}

export async function deleteProduct(id: string) {
  if (!id) return { error: 'ID produk tidak valid.' }

  try {
    const supabase = await createClient()
    const storeId = await getStoreId()

    // 1. Dapatkan info produk terlebih dahulu untuk mengambil image_url
    const { data: product } = await supabase
      .from('products')
      .select('image_url')
      .eq('id', id)
      .eq('store_id', storeId)
      .single()

    // 2. Hapus dari database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId)

    if (error) throw error

    // 3. Hapus gambar terkait dari storage jika ada
    if (product?.image_url) {
      const parts = product.image_url.split('/product-images/')
      if (parts.length > 1) {
        const filePath = parts[1]
        await supabase.storage.from('product-images').remove([filePath])
      }
    }

    revalidatePath('/produk')
    revalidatePath('/kasir')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menghapus produk.' }
  }
}
