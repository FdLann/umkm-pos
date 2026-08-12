'use client'

import { useState, useTransition } from 'react'
import { checkout } from '@/actions/transaction'
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  DollarSign,
  QrCode,
  Printer,
  X,
  Check,
  Loader2,
  Image as ImageIcon
} from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number | null
  image_url: string | null
  category_id: string | null
}

interface Store {
  id: string
  name: string
  description: string | null
}

interface CartItem {
  product_id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
  stock: number | null
}

interface KasirClientProps {
  initialProducts: Product[]
  categories: Category[]
  store: Store
}

export default function KasirClient({ initialProducts, categories, store }: KasirClientProps) {
  const [products] = useState<Product[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])

  // Modal & Checkout State
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH')
  const [paidAmount, setPaidAmount] = useState('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  
  // Successful Receipt State
  const [receipt, setReceipt] = useState<any>(null)

  const [isPending, startTransition] = useTransition()

  // Filter Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calculate cart summary
  const cartTotal = cart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0)
  const totalItems = cart.reduce((acc, curr) => acc + curr.quantity, 0)

  // Cart Actions
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.product_id === product.id)

    if (existingIndex > -1) {
      const item = cart[existingIndex]
      if (product.stock !== null && item.quantity >= product.stock) {
        alert(`Stok tidak mencukupi. Maksimal stok tersedia: ${product.stock}`)
        return
      }
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      setCart(newCart)
    } else {
      if (product.stock !== null && product.stock <= 0) {
        alert('Stok produk habis.')
        return
      }
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image_url: product.image_url,
          stock: product.stock
        }
      ])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    const index = cart.findIndex((item) => item.product_id === productId)
    if (index === -1) return

    const item = cart[index]
    const newQuantity = item.quantity + delta

    if (newQuantity <= 0) {
      setCart(cart.filter((i) => i.product_id !== productId))
    } else {
      if (delta > 0 && item.stock !== null && item.quantity >= item.stock) {
        alert(`Stok tidak mencukupi. Maksimal stok tersedia: ${item.stock}`)
        return
      }
      const newCart = [...cart]
      newCart[index].quantity = newQuantity
      setCart(newCart)
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId))
  }

  const clearCart = () => {
    setCart([])
  }

  // CASH Payment helpers
  const cashAmount = parseFloat(paidAmount) || 0
  const changeAmount = Math.max(0, cashAmount - cartTotal)
  const isPaymentInsufficient = paymentMethod === 'CASH' && cashAmount < cartTotal

  // Quick Cash Shortcuts
  const quickCashOptions = [
    cartTotal,
    Math.ceil(cartTotal / 10000) * 10000,
    Math.ceil(cartTotal / 50000) * 50000,
    100000
  ].filter((val, index, self) => val >= cartTotal && self.indexOf(val) === index)

  // Handle Checkout Submit
  const handleCheckoutSubmit = () => {
    setCheckoutError(null)

    if (cart.length === 0) return

    const itemsForCheckout = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity
    }))

    const finalPaidAmount = paymentMethod === 'CASH' ? cashAmount : cartTotal

    startTransition(async () => {
      const res = await checkout(paymentMethod, finalPaidAmount, itemsForCheckout)

      if (res.error) {
        setCheckoutError(res.error)
      } else {
        setReceipt(res.transaction)
        setIsCheckoutOpen(false)
        clearCart()
        setIsCartOpenMobile(false)
      }
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative h-full">
      {/* 1. KIRI: DAFTAR PRODUK (KASIR GRID) */}
      <div className="flex-1 flex flex-col space-y-6">
        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-4 bg-surface border border-surface-dim p-4 rounded-3xl z-10 shadow-sm shadow-slate-100">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari menu produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 pl-11 pr-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
            />
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-surface-dim'
              }`}
            >
              Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-surface-dim'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 overflow-y-auto max-h-[70vh] pr-1">
            {filteredProducts.map((product) => {
              const inCartQty = cart.find(i => i.product_id === product.id)?.quantity || 0
              const isOutOfStock = product.stock !== null && product.stock <= 0

              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product)}
                  className={`bg-surface border text-left rounded-3xl overflow-hidden flex flex-col justify-between transition group relative shadow-sm shadow-slate-100 ${
                    isOutOfStock 
                      ? 'border-slate-100 opacity-50 cursor-not-allowed'
                      : 'border-surface-dim hover:border-primary/45 hover:shadow-md active:scale-[0.98] cursor-pointer'
                  }`}
                >
                  {/* Image/Placeholder */}
                  <div className="aspect-[4/3] w-full bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-surface-dim">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}

                    {/* Quantity Badge */}
                    {inCartQty > 0 && (
                      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary border border-white flex items-center justify-center text-[11px] font-bold text-white shadow-md">
                        {inCartQty}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-primary transition">
                        {product.name}
                      </h4>
                      {product.stock !== null && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isOutOfStock ? 'text-rose-600' : 'text-slate-400'
                        }`}>
                          {isOutOfStock ? 'Habis' : `Stok: ${product.stock}`}
                        </span>
                      )}
                    </div>
                    <span className="font-extrabold text-sm text-primary block">
                      {formatRupiah(product.price)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="min-h-[250px] flex flex-col items-center justify-center text-slate-400 bg-surface border border-surface-dim border-dashed rounded-3xl p-8">
            <ShoppingCart className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-sm">Tidak ada menu produk yang cocok.</p>
          </div>
        )}
      </div>

      {/* 2. KANAN: PANEL KERANJANG (DESKTOP) */}
      <div className="hidden lg:flex lg:w-96 bg-surface-container border border-surface-dim rounded-3xl p-6 flex-col justify-between max-h-[80vh] shadow-sm">
        <div className="flex flex-col space-y-4 overflow-hidden flex-1">
          <div className="flex justify-between items-center border-b border-surface-dim pb-3">
            <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <span>Keranjang Belanja</span>
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-bold text-rose-600 hover:text-rose-755 transition cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-surface-dim/60 pr-1">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div key={item.product_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-slate-800 truncate">{item.name}</h5>
                    <span className="text-xs text-primary font-bold">
                      {formatRupiah(item.price)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1.5 bg-white border border-surface-dim hover:bg-slate-100 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-800 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1.5 bg-white border border-surface-dim hover:bg-slate-100 active:scale-90 rounded-lg text-slate-600 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1.5 hover:bg-rose-500/10 text-rose-600 rounded-lg transition ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-10">
                <ShoppingCart className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-center">Keranjang masih kosong. Klik menu produk di sebelah kiri.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Checkout Panel */}
        <div className="border-t border-surface-dim pt-4 mt-4 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 font-semibold">Total ({totalItems} Item)</span>
            <span className="font-black text-xl text-primary">{formatRupiah(cartTotal)}</span>
          </div>

          <button
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-primary hover:bg-primary-container active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center space-x-2 transition disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md shadow-primary/10"
          >
            <span>Bayar Sekarang</span>
          </button>
        </div>
      </div>

      {/* 3. MOBILE FLOATING CART BAR */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-4 right-4 z-40 bg-surface-container border border-surface-dim rounded-2xl p-4 flex items-center justify-between shadow-2xl">
          <button
            onClick={() => setIsCartOpenMobile(true)}
            className="flex items-center space-x-3 text-left flex-1 cursor-pointer"
          >
            <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                {totalItems}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-555 block font-semibold">Total Belanja</span>
              <span className="font-black text-sm text-primary">{formatRupiah(cartTotal)}</span>
            </div>
          </button>
          <button
            onClick={() => setIsCheckoutOpen(true)}
            className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
          >
            Bayar
          </button>
        </div>
      )}

      {/* 4. MOBILE CART DRAWER */}
      {isCartOpenMobile && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm lg:hidden flex flex-col justify-end">
          <div className="bg-surface border-t border-surface-dim rounded-t-3xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-surface-dim pb-3 mb-4">
              <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span>Keranjang ({totalItems})</span>
              </h3>
              <button
                onClick={() => setIsCartOpenMobile(false)}
                className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-surface-dim/60 pr-1">
              {cart.map((item) => (
                <div key={item.product_id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-sm text-slate-800 truncate">{item.name}</h5>
                    <span className="text-xs text-primary font-bold">
                      {formatRupiah(item.price)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="p-1.5 bg-slate-150 rounded-lg text-slate-600"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-800 w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="p-1.5 bg-slate-150 rounded-lg text-slate-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product_id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-surface-dim pt-4 mt-4 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-semibold">Total Belanja</span>
                <span className="font-black text-lg text-primary">{formatRupiah(cartTotal)}</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full bg-primary hover:bg-primary-container text-white font-bold py-3.5 rounded-2xl flex justify-center transition cursor-pointer"
              >
                Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHECKOUT MODAL (TUNAI & QRIS) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-surface-dim w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-dim">
              <div>
                <h3 className="font-extrabold text-lg text-foreground">Pembayaran</h3>
                <span className="text-xs text-slate-500 font-semibold">Total Tagihan: {formatRupiah(cartTotal)}</span>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Form */}
            <div className="p-6 space-y-5 flex-1">
              {checkoutError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
                  {checkoutError}
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 border border-surface-dim/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH')
                    setCheckoutError(null)
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('QRIS')
                    setCheckoutError(null)
                  }}
                  className={`py-3 px-4 rounded-xl font-bold text-sm transition flex items-center justify-center space-x-2 cursor-pointer ${
                    paymentMethod === 'QRIS'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-650 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>QRIS</span>
                </button>
              </div>

              {/* Conditional views */}
              {paymentMethod === 'CASH' ? (
                <div className="space-y-4">
                  {/* Uang Diterima */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="paid-amount">
                      Uang Diterima (Rp)
                    </label>
                    <input
                      id="paid-amount"
                      type="number"
                      placeholder="Masukkan jumlah pembayaran..."
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground font-black outline-none text-base transition"
                    />
                  </div>

                  {/* Quick Cash Shortcuts */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-450 uppercase tracking-wider font-bold">Uang Pas / Nominal Cepat</span>
                    <div className="grid grid-cols-2 gap-2">
                      {quickCashOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setPaidAmount(opt.toString())}
                          className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-xl text-slate-700 transition border border-surface-dim/80 cursor-pointer"
                        >
                          {opt === cartTotal ? 'Uang Pas' : formatRupiah(opt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hitung Kembalian */}
                  <div className="p-4 bg-slate-50 border border-surface-dim rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block font-semibold">Kembalian</span>
                      {isPaymentInsufficient ? (
                        <span className="text-xs font-bold text-rose-600">
                          Kurang {formatRupiah(cartTotal - cashAmount)}
                        </span>
                      ) : (
                        <span className="text-lg font-black text-primary">
                          {formatRupiah(changeAmount)}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500 text-xs font-bold">
                      {isPaymentInsufficient ? '⚠️ Uang Kurang' : '✔️ Cukup'}
                    </div>
                  </div>
                </div>
              ) : (
                // QRIS flow
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <div className="bg-white p-3 rounded-2xl shadow-md border border-slate-200">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                        `MOCK-QRIS-PAYMENT-FOR-${store.name}-TOTAL-${cartTotal}`
                      )}`}
                      alt="QRIS Code"
                      className="w-40 h-40 object-contain"
                    />
                  </div>
                  <div className="text-center space-y-1.5 px-4">
                    <span className="text-xs font-black text-primary uppercase tracking-wider block">QRIS STATIS</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      Silakan scan QRIS di atas melalui dompet digital pembeli (GoPay, OVO, Dana, ShopeePay) untuk melakukan pembayaran.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-6 border-t border-surface-dim flex gap-3">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                disabled={isPending}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold py-3.5 rounded-2xl transition disabled:opacity-50 text-sm cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || isPaymentInsufficient}
                onClick={handleCheckoutSubmit}
                className="flex-1 bg-primary hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] text-white font-black py-3.5 rounded-2xl transition flex items-center justify-center space-x-2 text-sm cursor-pointer shadow-md shadow-primary/10"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Selesaikan Transaksi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:bg-white print:p-0 animate-fade-in">
          <div className="bg-surface border border-surface-dim w-full max-w-sm rounded-3xl shadow-2xl p-6 space-y-6 flex flex-col print:bg-white print:border-none print:shadow-none print:w-full print:max-w-none print:text-black print-container-card">
            
            <style>{`
              @media print {
                aside, header, nav, .no-print, button, form, .lg\\:flex, .flex-1 {
                  display: none !important;
                }
                body, html {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .fixed.inset-0 {
                  position: absolute !important;
                  inset: 0 !important;
                  background: white !important;
                  backdrop-filter: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                }
                .print-container-card {
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 auto !important;
                  width: 58mm !important;
                  max-width: 58mm !important;
                  box-sizing: border-box !important;
                }
                .print-struk {
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 9px !important;
                  line-height: 1.3 !important;
                  color: black !important;
                  width: 100% !important;
                  text-align: left !important;
                }
                .print-struk * {
                  font-family: 'Courier New', Courier, monospace !important;
                  font-size: 9px !important;
                  color: black !important;
                }
                .print-center {
                  text-align: center !important;
                }
                .print-border-dashed {
                  border-top: 1px dashed black !important;
                  border-bottom: 1px dashed black !important;
                  border-style: dashed !important;
                  border-color: black !important;
                  border-left: none !important;
                  border-right: none !important;
                }
                .print-border-dashed-bottom {
                  border-bottom: 1px dashed black !important;
                  border-style: dashed !important;
                  border-color: black !important;
                  border-top: none !important;
                  border-left: none !important;
                  border-right: none !important;
                }
                @page {
                  margin: 0 !important;
                }
              }
            `}</style>

            <div className="print-struk space-y-5 text-center print-center">
              <div className="flex flex-col items-center justify-center space-y-2 no-print">
                <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                  <Check className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-primary text-base">Pembayaran Berhasil</h4>
              </div>

              <div className="space-y-4 text-left border-y border-dashed border-slate-200 print-border-dashed py-4">
                <div className="text-center print-center space-y-0.5 mb-4">
                  <h3 className="font-extrabold text-base text-foreground uppercase">{store.name}</h3>
                  <p className="text-xs text-slate-500">{store.description || 'Struk Kasir Digital'}</p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 border-b border-dashed border-slate-200 print-border-dashed-bottom pb-3">
                  <div className="flex justify-between">
                    <span>No. Transaksi:</span>
                    <span className="font-bold text-foreground">{receipt.transaction_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Waktu:</span>
                    <span>
                      {new Date(receipt.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Metode:</span>
                    <span className="font-bold uppercase text-foreground">
                      {receipt.payment_method === 'CASH' ? 'Tunai' : 'QRIS'}
                    </span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3.5 text-xs">
                  {receipt.transaction_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-700 block truncate">{item.product_name_snapshot}</span>
                        <span className="text-slate-555 text-[10px]">
                          {item.quantity} × {formatRupiah(item.price_snapshot)}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 text-right shrink-0">
                        {formatRupiah(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="space-y-2 text-xs border-t border-dashed border-slate-200 print-border-dashed pt-3">
                  <div className="flex justify-between font-bold text-slate-850">
                    <span>Total Belanja:</span>
                    <span className="text-sm text-primary">{formatRupiah(receipt.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Dibayar:</span>
                    <span>{formatRupiah(receipt.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(receipt.change_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="text-center print-center text-[10px] text-slate-400">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 no-print">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl flex items-center justify-center space-x-2 text-sm transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Struk</span>
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 bg-primary hover:bg-primary-container text-white font-black py-3.5 rounded-2xl text-sm transition active:scale-95 cursor-pointer shadow-md shadow-primary/10"
              >
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
