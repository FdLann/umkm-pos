import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/actions/auth'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  History,
  Settings,
  LogOut,
  Store as StoreIcon
} from 'lucide-react'

// Sidebar Link Component
interface SidebarLinkProps {
  href: string
  icon: React.ReactNode
  label: string
}

function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center space-x-3 px-4 py-3.5 rounded-2xl text-slate-700 hover:text-primary hover:bg-surface-container-high transition duration-200 text-sm font-bold group"
    >
      <span className="text-slate-500 group-hover:text-primary transition">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Get store info
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!store) {
    redirect('/store/create')
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">
      {/* 1. DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-64 bg-surface-container border-r border-surface-dim flex-col justify-between shrink-0 p-5">
        <div className="space-y-8">
          {/* Store Brand */}
          <div className="flex items-center space-x-3 px-2">
            <div className="p-2 bg-primary/10 border border-primary/20 rounded-xl text-primary">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-sm font-extrabold truncate text-foreground">{store.name}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Kasir POS</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            <SidebarLink href="/" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
            <SidebarLink href="/kasir" icon={<ShoppingCart className="w-5 h-5" />} label="Kasir" />
            <SidebarLink href="/produk" icon={<Package className="w-5 h-5" />} label="Produk" />
            <SidebarLink href="/kategori" icon={<Layers className="w-5 h-5" />} label="Kategori" />
            <SidebarLink href="/transaksi" icon={<History className="w-5 h-5" />} label="Riwayat" />
            <SidebarLink href="/pengaturan" icon={<Settings className="w-5 h-5" />} label="Pengaturan" />
          </nav>
        </div>

        {/* User / Logout */}
        <div className="pt-4 border-t border-surface-dim">
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-rose-600 hover:bg-rose-500/10 transition duration-200 text-sm font-bold text-left cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar Akun</span>
            </button>
          </form>
        </div>
      </aside>

      {/* 2. MOBILE HEADER & BOTTOM NAV */}
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 bg-surface-container border-b border-surface-dim z-30 sticky top-0">
        <div className="flex items-center space-x-2">
          <StoreIcon className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm text-foreground truncate max-w-[150px]">{store.name}</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          Kasir Aktif
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface-container/95 backdrop-blur-lg border-t border-surface-dim flex justify-around py-2.5 z-30 px-2 shadow-lg">
        <Link href="/" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </Link>
        <Link href="/kasir" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <ShoppingCart className="w-5 h-5 mb-0.5" />
          <span>Kasir</span>
        </Link>
        <Link href="/produk" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <Package className="w-5 h-5 mb-0.5" />
          <span>Produk</span>
        </Link>
        <Link href="/kategori" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <Layers className="w-5 h-5 mb-0.5" />
          <span>Kategori</span>
        </Link>
        <Link href="/transaksi" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <History className="w-5 h-5 mb-0.5" />
          <span>Riwayat</span>
        </Link>
        <Link href="/pengaturan" className="flex flex-col items-center justify-center text-slate-500 hover:text-primary active:scale-95 transition text-[10px] font-semibold">
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Pengaturan</span>
        </Link>
      </nav>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
