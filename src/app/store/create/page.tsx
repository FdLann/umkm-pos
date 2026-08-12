import { getStore } from '@/actions/store'
import { redirect } from 'next/navigation'
import CreateStoreForm from './CreateStoreForm'

export const metadata = {
  title: 'Buat Toko Baru - POS UMKM',
  description: 'Inisialisasi toko baru Anda di platform POS UMKM Kasir.',
}

export default async function CreateStorePage() {
  const store = await getStore()

  // Jika sudah punya toko, langsung arahkan ke Dashboard
  if (store) {
    redirect('/')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-emerald-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 text-white">
          <CreateStoreForm />
        </div>
      </div>
    </div>
  )
}
