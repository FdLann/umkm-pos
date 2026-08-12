'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email dan password harus diisi.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let errMsg = error.message
    if (error.message === 'Invalid login credentials') {
      errMsg = 'Email atau password salah.'
    } else if (error.message.includes('Email not confirmed')) {
      errMsg = 'Email belum terkonfirmasi. Silakan periksa kotak masuk email Anda.'
    }
    return { error: errMsg }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function register(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'Semua kolom wajib diisi.' }
  }

  if (password.length < 6) {
    return { error: 'Password minimal terdiri dari 6 karakter.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Mencoba login otomatis setelah registrasi berhasil
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (loginError) {
    // Jika auth mewajibkan email confirmation, user harus menunggunya
    if (loginError.message.includes('Email not confirmed')) {
      return { 
        success: 'Registrasi berhasil! Silakan periksa email Anda untuk memverifikasi akun sebelum masuk.',
        error: null 
      }
    }
    return { error: 'Registrasi berhasil, tetapi gagal masuk otomatis. Silakan masuk secara manual.' }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
