'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProduct, updateProduct, deleteProduct } from '@/actions/product'
import { Plus, Search, Filter, Edit2, Trash2, Image as ImageIcon, Loader2, X, Info, Check } from 'lucide-react'

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
  categories: Category | null
}

interface Store {
  id: string
  name: string
}

interface ProductClientProps {
  initialProducts: Product[]
  categories: Category[]
  store: Store
}

export default function ProductClient({ initialProducts, categories, store }: ProductClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formTrackStock, setFormTrackStock] = useState(true)
  const [formStock, setFormStock] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')

  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Actions transitions
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (initialProducts.length !== products.length) {
    setProducts(initialProducts)
  }

  // Handle Search and Filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategoryFilter === 'ALL' || product.category_id === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingProduct(null)
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormTrackStock(false)
    setFormStock('')
    setFormCategoryId('')
    setImageFile(null)
    setImagePreviewUrl(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product)
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(product.price.toString())
    setFormTrackStock(product.stock !== null)
    setFormStock(product.stock !== null ? product.stock.toString() : '')
    setFormCategoryId(product.category_id || '')
    setImageFile(null)
    setImagePreviewUrl(product.image_url)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      setFormError('Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setFormError('Ukuran gambar terlalu besar. Maksimal adalah 2 MB.')
      return
    }

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setFormError(null)
  }

  // Handle Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError('Nama produk wajib diisi.')
      return
    }

    const priceNum = parseFloat(formPrice)
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Harga produk tidak valid.')
      return
    }

    let stockNum: number | null = null
    if (formTrackStock) {
      const parsedStock = parseInt(formStock)
      if (isNaN(parsedStock) || parsedStock < 0) {
        setFormError('Stok produk harus diisi jika pelacakan stok aktif.')
        return
      }
      stockNum = parsedStock
    }

    startTransition(async () => {
      try {
        let finalImageUrl = editingProduct ? editingProduct.image_url : null

        if (imageFile) {
          const supabase = createClient()
          const fileExt = imageFile.name.split('.').pop()
          const uniqueId = Math.random().toString(36).substring(2)
          const fileName = `product-${uniqueId}-${Date.now()}.${fileExt}`
          const filePath = `store-${store.id}/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: true,
            })

          if (uploadError) {
            throw new Error(`Gagal mengunggah gambar: ${uploadError.message}`)
          }

          const { data } = supabase.storage.from('product-images').getPublicUrl(filePath)
          finalImageUrl = data.publicUrl
        }

        const payload = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          price: priceNum,
          stock: stockNum,
          categoryId: formCategoryId || undefined,
          imageUrl: finalImageUrl,
        }

        let res
        if (editingProduct) {
          res = await updateProduct(editingProduct.id, payload)
        } else {
          res = await createProduct(payload)
        }

        if (res.error) {
          setFormError(res.error)
        } else {
          setGlobalMessage({
            type: 'success',
            text: editingProduct ? 'Produk berhasil diubah.' : 'Produk berhasil ditambahkan.',
          })
          setIsModalOpen(false)
          setTimeout(() => window.location.reload(), 1000)
        }
      } catch (err: any) {
        setFormError(err.message || 'Terjadi kesalahan sistem saat menyimpan produk.')
      }
    })
  }

  // Handle Delete Product
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus produk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteProduct(id)
      if (res.error) {
        setGlobalMessage({ type: 'error', text: res.error })
      } else {
        setProducts(products.filter(p => p.id !== id))
        setGlobalMessage({ type: 'success', text: 'Produk berhasil dihapus.' })
      }
    })
  }

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Daftar Produk</h1>
          <p className="text-slate-500 mt-1">Kelola harga, stok, foto, dan kategori produk dagangan Anda.</p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-container text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-primary/10 transition active:scale-95 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Global Toast Messages */}
      {globalMessage && (
        <div className={`p-4 rounded-2xl text-sm border flex items-center justify-between font-semibold ${
          globalMessage.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-primary'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
        }`}>
          <span>{globalMessage.text}</span>
          <button onClick={() => setGlobalMessage(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface border border-surface-dim p-4 rounded-3xl shadow-sm shadow-slate-100">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 pl-11 pr-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
          />
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-white border border-surface-dim text-slate-700 rounded-2xl py-3 px-4 text-sm focus:border-primary outline-none cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Product List Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-surface border border-surface-dim rounded-3xl overflow-hidden flex flex-col justify-between transition duration-300 hover:border-slate-350 hover:shadow-md shadow-sm shadow-slate-100 group relative"
            >
              {/* Product Image */}
              <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-surface-dim">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-350"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-350 space-y-1">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-[10px] uppercase font-bold tracking-wider">No Image</span>
                  </div>
                )}
                {product.categories && (
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur border border-surface-dim text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-1 rounded-full shadow-sm">
                    {product.categories.name}
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <h3 className="font-bold text-base text-slate-800 line-clamp-1 group-hover:text-primary transition">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 min-h-[32px]">
                    {product.description || 'Tidak ada deskripsi.'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-dim">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Harga</span>
                    <span className="font-extrabold text-sm text-primary">{formatRupiah(product.price)}</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Stok</span>
                    <span className={`text-xs font-bold ${
                      product.stock === null
                        ? 'text-slate-500'
                        : product.stock === 0
                        ? 'text-rose-600'
                        : product.stock <= 5
                        ? 'text-amber-600'
                        : 'text-slate-700'
                    }`}>
                      {product.stock === null ? 'Tidak Dibatasi' : product.stock === 0 ? 'Habis' : `${product.stock} Unit`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-50 border-t border-surface-dim flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(product)}
                  disabled={isPending}
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-surface-dim transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Ubah Produk"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(product.id, product.name)}
                  disabled={isPending}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl border border-rose-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  title="Hapus Produk"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-surface border border-surface-dim border-dashed rounded-3xl text-slate-400 space-y-2 p-8">
          <ImageIcon className="w-16 h-16 text-slate-300" />
          <p className="text-sm text-center">Tidak ada produk yang cocok dengan pencarian Anda.</p>
          <button
            onClick={handleOpenCreate}
            className="text-xs font-bold text-primary hover:text-primary-container transition underline underline-offset-4 cursor-pointer"
          >
            Tambah Produk Baru Sekarang
          </button>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface border border-surface-dim w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-dim">
              <h2 className="text-lg font-bold text-foreground">
                {editingProduct ? 'Ubah Informasi Produk' : 'Tambah Produk Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-sm font-semibold">
                  {formError}
                </div>
              )}

              {/* Upload Gambar */}
              <div className="flex items-center gap-5 p-4 bg-slate-50 border border-surface-dim rounded-2xl">
                <div className="w-20 h-20 bg-white border border-surface-dim rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {imagePreviewUrl ? (
                    <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <span className="text-xs font-bold text-slate-500 block">Foto Produk</span>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-white border border-surface-dim hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
                    >
                      Pilih Gambar
                    </button>
                    {imagePreviewUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreviewUrl(null)
                        }}
                        className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-450 block">PNG, JPG, WEBP. Maksimal 2MB.</span>
                </div>
              </div>

              {/* Nama Produk */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="prod-name">
                  Nama Produk
                </label>
                <input
                  id="prod-name"
                  type="text"
                  required
                  placeholder="Contoh: Es Teh Manis"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="prod-category">
                  Kategori
                </label>
                <select
                  id="prod-category"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-slate-700 outline-none text-sm transition cursor-pointer"
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Harga Jual */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="prod-price">
                  Harga Jual (Rp)
                </label>
                <input
                  id="prod-price"
                  type="number"
                  required
                  placeholder="Contoh: 5000"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
                />
              </div>

              {/* Switch Pelacakan Stok */}
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-surface-dim rounded-2xl">
                <div className="space-y-0.5">
                  <span className="text-sm font-bold text-slate-700">Lacak Stok</span>
                  <p className="text-xs text-slate-550">Aktifkan jika stok barang terbatas.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTrackStock}
                    onChange={(e) => setFormTrackStock(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white peer-checked:after:border-primary"></div>
                </label>
              </div>

              {/* Stok input */}
              {formTrackStock && (
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="prod-stock">
                    Jumlah Stok Tersedia
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    required={formTrackStock}
                    placeholder="Contoh: 20"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition"
                  />
                </div>
              )}

              {/* Deskripsi */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="prod-desc">
                  Deskripsi Produk (Opsional)
                </label>
                <textarea
                  id="prod-desc"
                  rows={3}
                  placeholder="Contoh: Es teh segar dengan gula pasir murni."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 px-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-surface-dim">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl transition duration-200 text-sm disabled:opacity-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-primary hover:bg-primary-container text-white font-bold py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 transition duration-200 text-sm disabled:opacity-50 cursor-pointer shadow-md shadow-primary/10"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Simpan Produk</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
