import { cache } from 'react'
import { createClient } from './server'

/**
 * Mengambil authenticated user saat ini dengan deduplikasi request otomatis via React cache().
 * Jika dipanggil berkali-kali dalam 1 request yang sama, hanya akan memanggil Supabase 1 kali.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
})

/**
 * Mengambil store aktif saat ini dengan deduplikasi request otomatis via React cache().
 * Mencegah waterfall dan belasan query berulang ke Supabase dalam 1 kali render halaman.
 */
export const getCurrentStore = cache(async () => {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: store, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (error || !store) return null
  return store
})

/**
 * Helper cepat mengambil store_id dengan error jika belum login/toko tidak ada.
 */
export const getActiveStoreId = cache(async (): Promise<string> => {
  const store = await getCurrentStore()
  if (!store) throw new Error('Toko atau sesi login tidak ditemukan')
  return store.id
})
