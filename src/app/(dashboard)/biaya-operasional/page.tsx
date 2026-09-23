import React from 'react'
import { getFixedCosts, getStorePricingSettings } from '@/actions/fixedCost'
import BiayaOperasionalClient from './BiayaOperasionalClient'

export const metadata = {
  title: 'Biaya Tetap & HPP Operasional | POS UMKM',
  description: 'Kelola biaya tetap bulanan, penyusutan alat, dan alokasi modal per porsi.',
}

export default async function BiayaOperasionalPage() {
  const [fixedCosts, settings] = await Promise.all([
    getFixedCosts(),
    getStorePricingSettings(),
  ])

  return (
    <BiayaOperasionalClient
      initialFixedCosts={fixedCosts}
      initialSettings={settings}
    />
  )
}
