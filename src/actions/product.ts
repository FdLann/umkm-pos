'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveStoreId } from '@/lib/supabase/authStore'
import { revalidatePath } from 'next/cache'

export async function getProducts() {
  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

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

export interface CreateProductInput {
  name: string
  description?: string
  price: number
  stock: number | null
  categoryId?: string | null
  imageUrl?: string | null
  cost?: number
  otherCost?: number
  wastePercent?: number
  targetMargin?: number
  useRecipeCost?: boolean
}

export async function createProduct(formData: CreateProductInput) {
  if (!formData.name) return { error: 'Nama produk wajib diisi.' }
  if (formData.price < 0) return { error: 'Harga produk tidak boleh kurang dari 0.' }
  if (formData.stock !== null && formData.stock < 0) return { error: 'Stok tidak boleh kurang dari 0.' }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('products')
      .insert({
        store_id: storeId,
        category_id: formData.categoryId || null,
        name: formData.name,
        description: formData.description || null,
        price: formData.price,
        stock: formData.stock,
        image_url: formData.imageUrl || null,
        cost: formData.cost !== undefined ? Math.max(0, formData.cost) : 0,
        other_cost: formData.otherCost !== undefined ? Math.max(0, formData.otherCost) : 0,
        waste_percent: formData.wastePercent !== undefined ? Math.max(0, formData.wastePercent) : 5,
        target_margin: formData.targetMargin !== undefined ? Math.max(0, formData.targetMargin) : 30,
        use_recipe_cost: !!formData.useRecipeCost,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/produk')
    revalidatePath('/kasir')
    revalidatePath('/')
    return { success: true, data }
  } catch (err: any) {
    return { error: err.message || 'Gagal menambahkan produk.' }
  }
}

export interface UpdateProductInput {
  name: string
  description?: string
  price: number
  stock: number | null
  categoryId?: string | null
  imageUrl?: string | null
  cost?: number
  otherCost?: number
  wastePercent?: number
  targetMargin?: number
  useRecipeCost?: boolean
}

export async function updateProduct(
  id: string,
  formData: UpdateProductInput
) {
  if (!id) return { error: 'ID produk tidak valid.' }
  if (!formData.name) return { error: 'Nama produk wajib diisi.' }
  if (formData.price < 0) return { error: 'Harga produk tidak boleh kurang dari 0.' }
  if (formData.stock !== null && formData.stock < 0) return { error: 'Stok tidak boleh kurang dari 0.' }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const updateData: Record<string, any> = {
      category_id: formData.categoryId || null,
      name: formData.name,
      description: formData.description || null,
      price: formData.price,
      stock: formData.stock,
      image_url: formData.imageUrl || null,
    }

    if (formData.cost !== undefined) updateData.cost = Math.max(0, formData.cost)
    if (formData.otherCost !== undefined) updateData.other_cost = Math.max(0, formData.otherCost)
    if (formData.wastePercent !== undefined) updateData.waste_percent = Math.max(0, formData.wastePercent)
    if (formData.targetMargin !== undefined) updateData.target_margin = Math.max(0, formData.targetMargin)
    if (formData.useRecipeCost !== undefined) updateData.use_recipe_cost = !!formData.useRecipeCost

    const { error } = await supabase
      .from('products')
      .update(updateData)
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
    const storeId = await getActiveStoreId()

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
