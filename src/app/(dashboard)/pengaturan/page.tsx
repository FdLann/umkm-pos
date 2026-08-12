import React from 'react'
import { getStore } from '@/actions/store'
import { redirect } from 'next/navigation'
import PengaturanClient from './PengaturanClient'

export const metadata = {
  title: 'Pengaturan Toko - POS UMKM',
  description: 'Kelola profil, logo, dan identitas toko/warung UMKM Anda.',
}

export default async function PengaturanPage() {
  const store = await getStore()

  if (!store) {
    redirect('/store/create')
  }

  return <PengaturanClient initialStore={store} />
}
