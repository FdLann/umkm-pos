'use server'

import { createClient } from '@/lib/supabase/server'
import { getActiveStoreId } from '@/lib/supabase/authStore'
import { revalidatePath } from 'next/cache'

export interface RecipeItemWithIngredient {
  id?: string
  ingredient_id: string
  qty_used: number
  ingredient?: {
    id: string
    name: string
    unit: string
    cost_per_unit: number
    purchase_price: number
    purchase_qty: number
  }
}

export interface SaveRecipeInput {
  productId: string
  items: {
    ingredient_id: string
    qty_used: number
  }[]
  pricingConfig?: {
    cost?: number
    other_cost?: number
    waste_percent?: number
    target_margin?: number
    use_recipe_cost?: boolean
    price?: number
  }
}

export async function getProductRecipe(productId: string): Promise<RecipeItemWithIngredient[]> {
  if (!productId) return []

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    const { data, error } = await supabase
      .from('recipe_items')
      .select('id, ingredient_id, qty_used, ingredients(id, name, unit, cost_per_unit, purchase_price, purchase_qty)')
      .eq('product_id', productId)
      .eq('store_id', storeId)

    if (error) throw error

    return (data || []).map((item: any) => ({
      id: item.id,
      ingredient_id: item.ingredient_id,
      qty_used: Number(item.qty_used) || 0,
      ingredient: item.ingredients ? {
        id: item.ingredients.id,
        name: item.ingredients.name,
        unit: item.ingredients.unit,
        cost_per_unit: Number(item.ingredients.cost_per_unit) || 0,
        purchase_price: Number(item.ingredients.purchase_price) || 0,
        purchase_qty: Number(item.ingredients.purchase_qty) || 1,
      } : undefined,
    }))
  } catch (err) {
    console.error('getProductRecipe error:', err)
    return []
  }
}

export async function saveProductRecipe(input: SaveRecipeInput) {
  const { productId, items, pricingConfig } = input
  if (!productId) return { error: 'ID produk tidak valid.' }

  try {
    const supabase = await createClient()
    const storeId = await getActiveStoreId()

    // 1. Verifikasi kepemilikan produk
    const { data: product, error: productErr } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .eq('store_id', storeId)
      .single()

    if (productErr || !product) {
      return { error: 'Produk tidak ditemukan atau bukan milik Anda.' }
    }

    // 2. Hapus semua resep lama untuk produk ini
    const { error: deleteErr } = await supabase
      .from('recipe_items')
      .delete()
      .eq('product_id', productId)
      .eq('store_id', storeId)

    if (deleteErr) throw deleteErr

    // 3. Masukkan baris resep baru jika ada
    const validItems = items.filter(
      (item) => item.ingredient_id && Number(item.qty_used) > 0
    )

    if (validItems.length > 0) {
      const rowsToInsert = validItems.map((item) => ({
        store_id: storeId,
        product_id: productId,
        ingredient_id: item.ingredient_id,
        qty_used: Number(item.qty_used),
      }))

      const { error: insertErr } = await supabase
        .from('recipe_items')
        .insert(rowsToInsert)

      if (insertErr) throw insertErr
    }

    // 4. Update konfigurasi harga dan HPP jika dikirimkan
    if (pricingConfig) {
      const updateData: Record<string, any> = {}
      if (pricingConfig.cost !== undefined) updateData.cost = Math.max(0, pricingConfig.cost)
      if (pricingConfig.other_cost !== undefined) updateData.other_cost = Math.max(0, pricingConfig.other_cost)
      if (pricingConfig.waste_percent !== undefined) updateData.waste_percent = Math.max(0, pricingConfig.waste_percent)
      if (pricingConfig.target_margin !== undefined) updateData.target_margin = Math.max(0, pricingConfig.target_margin)
      if (pricingConfig.use_recipe_cost !== undefined) updateData.use_recipe_cost = !!pricingConfig.use_recipe_cost
      if (pricingConfig.price !== undefined && pricingConfig.price >= 0) updateData.price = Math.round(pricingConfig.price)

      if (Object.keys(updateData).length > 0) {
        const { error: updateProductErr } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', productId)
          .eq('store_id', storeId)

        if (updateProductErr) throw updateProductErr
      }
    }

    revalidatePath('/produk')
    revalidatePath('/kasir')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Gagal menyimpan resep produk.' }
  }
}
