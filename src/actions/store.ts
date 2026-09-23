'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getCurrentStore } from '@/lib/supabase/authStore'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function getStore() {
  return await getCurrentStore()
}

export async function createStore(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name) {
    return { error: 'Nama toko wajib diisi.' }
  }

  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return { error: 'Sesi kedaluwarsa. Silakan masuk kembali.' }
  }

  const { error } = await supabase
    .from('stores')
    .insert({
      owner_id: user.id,
      name,
      description: description || null,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function updateStore(formData: FormData) {
  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const logoUrl = formData.get('logo_url') as string

  if (!id || !name) {
    return { error: 'Nama toko wajib diisi.' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('stores')
    .update({
      name,
      description: description || null,
      logo_url: logoUrl || null,
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
