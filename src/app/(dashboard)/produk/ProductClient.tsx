'use client'

import React, { useState, useTransition, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createProduct, updateProduct, deleteProduct } from '@/actions/product'
import { getProductRecipe, saveProductRecipe, RecipeItemWithIngredient } from '@/actions/recipe'
import { IngredientData } from '@/actions/ingredient'
import { StorePricingSettings } from '@/actions/fixedCost'
import {
  calculatePricing,
  calculateRecipeCost,
  formatRupiah,
  formatUnitCost,
  PricingResult,
} from '@/lib/pricing'
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  X,
  Check,
  Wheat,
  Calculator,
  AlertTriangle,
  Info,
  TrendingUp,
  Sliders,
  DollarSign,
  Package,
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
  categories: Category | null
  cost?: number
  other_cost?: number
  waste_percent?: number
  target_margin?: number
  use_recipe_cost?: boolean
}

interface Store {
  id: string
  name: string
}

interface ProductClientProps {
  initialProducts: Product[]
  categories: Category[]
  store: Store
  initialIngredients?: IngredientData[]
  pricingSettings?: StorePricingSettings
}

interface RecipeRowState {
  ingredient_id: string
  qty_used: number
}

export default function ProductClient({
  initialProducts,
  categories,
  store,
  initialIngredients = [],
  pricingSettings,
}: ProductClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'recipe' | 'pricing'>('info')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Tab 1: Info Produk
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formManualCost, setFormManualCost] = useState('')
  const [formTrackStock, setFormTrackStock] = useState(false)
  const [formStock, setFormStock] = useState('')
  const [formCategoryId, setFormCategoryId] = useState('')

  // Tab 2: Resep Bahan
  const [recipeRows, setRecipeRows] = useState<RecipeRowState[]>([])
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false)

  // Tab 3: Kalkulator Harga & HPP
  const [formOtherCost, setFormOtherCost] = useState('0')
  const [formWastePercent, setFormWastePercent] = useState('5')
  const [formTargetMargin, setFormTargetMargin] = useState('30')
  const [formUseRecipeCost, setFormUseRecipeCost] = useState(false)
  const [formSimulatedPrice, setFormSimulatedPrice] = useState('')
  const [roundingStep, setRoundingStep] = useState<100 | 500 | 1000>(500)

  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Actions transitions
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)
  const [globalMessage, setGlobalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  // Hitung live perhitungan HPP dan Kalkulator Harga
  const ingredientsMap = new Map(initialIngredients.map((i) => [i.id, i]))

  const currentRecipeCostInputs = recipeRows.map((row) => {
    const ing = ingredientsMap.get(row.ingredient_id)
    const costPerUnit = ing ? Number(ing.cost_per_unit) || (ing.purchase_qty > 0 ? ing.purchase_price / ing.purchase_qty : 0) : 0
    return {
      qty_used: row.qty_used,
      cost_per_unit: costPerUnit,
    }
  })

  const livePricing: PricingResult = calculatePricing({
    recipeItems: currentRecipeCostInputs,
    manualCost: parseFloat(formManualCost) || 0,
    useRecipeCost: formUseRecipeCost,
    otherCost: parseFloat(formOtherCost) || 0,
    wastePercent: parseFloat(formWastePercent) || 0,
    targetMargin: parseFloat(formTargetMargin) || 30,
    totalMonthlyFixedCost: pricingSettings?.totalMonthlyFixedCost || 0,
    targetMonthlySales: pricingSettings?.targetMonthlySales || 500,
    sellingPrice: formSimulatedPrice ? parseFloat(formSimulatedPrice) : (parseFloat(formPrice) || undefined),
    roundingStep,
  })

  // Handle Search and Filter
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategoryFilter === 'ALL' || product.category_id === selectedCategoryFilter
    return matchesSearch && matchesCategory
  })

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingProduct(null)
    setActiveTab('info')
    setFormName('')
    setFormDescription('')
    setFormPrice('')
    setFormManualCost('')
    setFormTrackStock(false)
    setFormStock('')
    setFormCategoryId('')
    setRecipeRows([])
    setFormOtherCost('0')
    setFormWastePercent('5')
    setFormTargetMargin('30')
    setFormUseRecipeCost(false)
    setFormSimulatedPrice('')
    setImageFile(null)
    setImagePreviewUrl(null)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Modal for Edit
  const handleOpenEdit = async (product: Product) => {
    setEditingProduct(product)
    setActiveTab('info')
    setFormName(product.name)
    setFormDescription(product.description || '')
    setFormPrice(product.price.toString())
    setFormManualCost(product.cost ? product.cost.toString() : '0')
    setFormTrackStock(product.stock !== null)
    setFormStock(product.stock !== null ? product.stock.toString() : '')
    setFormCategoryId(product.category_id || '')
    setFormOtherCost(product.other_cost ? product.other_cost.toString() : '0')
    setFormWastePercent(product.waste_percent !== undefined ? product.waste_percent.toString() : '5')
    setFormTargetMargin(product.target_margin !== undefined ? product.target_margin.toString() : '30')
    setFormUseRecipeCost(!!product.use_recipe_cost)
    setFormSimulatedPrice(product.price.toString())
    setImageFile(null)
    setImagePreviewUrl(product.image_url)
    setFormError(null)
    setIsModalOpen(true)

    // Load existing recipe
    setIsLoadingRecipe(true)
    try {
      const recipe = await getProductRecipe(product.id)
      setRecipeRows(
        recipe.map((r) => ({
          ingredient_id: r.ingredient_id,
          qty_used: r.qty_used,
        }))
      )
    } catch (err) {
      console.error('Error loading product recipe:', err)
    } finally {
      setIsLoadingRecipe(false)
    }
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
      setFormError('Ukuran gambar terlalu besar. Maksimal 2 MB.')
      return
    }

    setImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setFormError(null)
  }

  // Add / Remove Recipe Row
  const handleAddRecipeRow = () => {
    if (initialIngredients.length === 0) {
      setFormError('Belum ada bahan baku terdaftar. Silakan tambah bahan baku terlebih dahulu di menu Bahan Baku.')
      return
    }
    const defaultIngId = initialIngredients[0].id
    setRecipeRows([...recipeRows, { ingredient_id: defaultIngId, qty_used: 1 }])
    setFormUseRecipeCost(true)
  }

  const handleRemoveRecipeRow = (index: number) => {
    const updated = recipeRows.filter((_, i) => i !== index)
    setRecipeRows(updated)
    if (updated.length === 0) {
      setFormUseRecipeCost(false)
    }
  }

  const handleUpdateRecipeRow = (index: number, field: 'ingredient_id' | 'qty_used', value: any) => {
    const updated = [...recipeRows]
    if (field === 'qty_used') {
      updated[index].qty_used = Math.max(0, parseFloat(value) || 0)
    } else {
      updated[index].ingredient_id = value
    }
    setRecipeRows(updated)
    setFormUseRecipeCost(true)
  }

  // Action "Pakai Harga Ini" dari Kalkulator Harga
  const handleApplyCalculatedPrice = (chosenPrice: number, chosenCost: number) => {
    setFormPrice(Math.round(chosenPrice).toString())
    setFormSimulatedPrice(Math.round(chosenPrice).toString())
    setFormManualCost(Math.round(chosenCost).toString())
    setGlobalMessage({
      type: 'success',
      text: `Harga jual disetel ke ${formatRupiah(chosenPrice)} (HPP: ${formatRupiah(chosenCost)}). Jangan lupa klik tombol Simpan.`,
    })
    setTimeout(() => setGlobalMessage(null), 4000)
  }

  // Submit Save Product
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

        const effectiveCost = formUseRecipeCost ? livePricing.totalCost : (parseFloat(formManualCost) || 0)

        const payload = {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          price: priceNum,
          stock: stockNum,
          categoryId: formCategoryId || undefined,
          imageUrl: finalImageUrl,
          cost: Math.round(effectiveCost),
          otherCost: parseFloat(formOtherCost) || 0,
          wastePercent: parseFloat(formWastePercent) || 5,
          targetMargin: parseFloat(formTargetMargin) || 30,
          useRecipeCost: formUseRecipeCost,
        }

        let res
        let savedProductId = editingProduct?.id

        if (editingProduct) {
          res = await updateProduct(editingProduct.id, payload)
        } else {
          res = await createProduct(payload)
          if (res?.data) {
            savedProductId = res.data.id
          }
        }

        if (res?.error) {
          setFormError(res.error)
          return
        }

        // Save recipes if productId exists
        if (savedProductId) {
          const recipeRes = await saveProductRecipe({
            productId: savedProductId,
            items: recipeRows,
            pricingConfig: {
              cost: Math.round(effectiveCost),
              other_cost: payload.otherCost,
              waste_percent: payload.wastePercent,
              target_margin: payload.targetMargin,
              use_recipe_cost: formUseRecipeCost,
              price: priceNum,
            },
          })

          if (recipeRes?.error) {
            console.error('Save recipe error:', recipeRes.error)
          }
        }

        setGlobalMessage({
          type: 'success',
          text: editingProduct ? 'Produk & Resep berhasil diubah.' : 'Produk baru berhasil ditambahkan.',
        })
        setIsModalOpen(false)
        setTimeout(() => window.location.reload(), 1000)
      } catch (err: any) {
        setFormError(err.message || 'Terjadi kesalahan sistem saat menyimpan produk.')
      }
    })
  }

  // Handle Delete Product
  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return
    }

    startTransition(async () => {
      const res = await deleteProduct(id)
      if (res?.error) {
        setGlobalMessage({ type: 'error', text: res.error })
      } else {
        setProducts(products.filter((p) => p.id !== id))
        setGlobalMessage({ type: 'success', text: `Produk "${name}" berhasil dihapus.` })
      }
      setTimeout(() => setGlobalMessage(null), 4000)
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Daftar Produk & Resep</h1>
          <p className="text-slate-500 mt-1">
            Kelola katalog produk, resep bahan baku, estimasi HPP, dan kalkulator harga jual.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white font-bold px-5 py-3 rounded-2xl shadow-sm transition active:scale-95 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Global Toast Messages */}
      {globalMessage && (
        <div
          className={`p-4 rounded-2xl text-sm border flex items-center justify-between font-semibold animate-in fade-in transition ${
            globalMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
          }`}
        >
          <div className="flex items-center space-x-2">
            {globalMessage.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{globalMessage.text}</span>
          </div>
          <button onClick={() => setGlobalMessage(null)} className="p-1 hover:bg-black/5 rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 bg-surface border border-surface-dim p-4 rounded-3xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau deskripsi produk..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-surface-dim focus:border-primary rounded-2xl py-3 pl-11 pr-4 text-foreground placeholder:text-slate-400 outline-none text-sm transition font-medium"
          />
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="bg-white border border-surface-dim text-slate-700 rounded-2xl py-3 px-4 text-sm focus:border-primary outline-none cursor-pointer font-semibold"
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
          {filteredProducts.map((product) => {
            const hpp = Number(product.cost) || 0
            const profit = product.price - hpp
            const margin = product.price > 0 ? Math.round((profit / product.price) * 100) : 0

            return (
              <div
                key={product.id}
                className="bg-surface border border-surface-dim rounded-3xl overflow-hidden flex flex-col justify-between transition duration-300 hover:shadow-md shadow-xs group relative"
              >
                {/* Product Image & Badges */}
                <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-surface-dim">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-350"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-350 space-y-1">
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">No Image</span>
                    </div>
                  )}

                  {product.categories && (
                    <span className="absolute top-3 left-3 bg-white/95 backdrop-blur border border-surface-dim text-[10px] font-bold uppercase tracking-wider text-primary px-2.5 py-1 rounded-full shadow-xs">
                      {product.categories.name}
                    </span>
                  )}

                  {product.use_recipe_cost && (
                    <span className="absolute top-3 right-3 bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                      <Wheat className="w-3 h-3" /> Resep
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

                  {/* Harga & HPP Badges */}
                  <div className="pt-2 border-t border-surface-dim space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Harga Jual</span>
                        <span className="font-extrabold text-base text-primary">{formatRupiah(product.price)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Modal HPP</span>
                        <span className="font-bold text-xs text-slate-600">
                          {hpp > 0 ? formatRupiah(hpp) : 'Belum dihitung'}
                        </span>
                      </div>
                    </div>

                    {hpp > 0 && (
                      <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1 rounded-xl border border-surface-dim">
                        <span className="text-slate-500 font-medium">Laba: {formatRupiah(profit)}</span>
                        <span className={`font-bold ${margin >= 30 ? 'text-emerald-700' : margin > 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                          Margin: {margin}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3 bg-slate-50 border-t border-surface-dim flex items-center justify-between">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
                    product.stock === null
                      ? 'text-slate-500'
                      : product.stock === 0
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {product.stock === null ? 'Stok Bebas' : `Stok: ${product.stock}`}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      disabled={isPending}
                      className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-surface-dim transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Edit & Resep"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={isPending}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-xl border border-rose-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="min-h-[300px] flex flex-col items-center justify-center bg-surface border border-surface-dim border-dashed rounded-3xl text-slate-400 space-y-2 p-8">
          <Package className="w-16 h-16 text-slate-300" />
          <p className="text-sm text-center">Tidak ada produk yang cocok dengan pencarian Anda.</p>
          <button
            onClick={handleOpenCreate}
            className="text-xs font-bold text-primary hover:underline cursor-pointer"
          >
            Tambah Produk Baru Sekarang
          </button>
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH TABS (Info, Resep, Kalkulator) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-surface border border-surface-dim w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-surface-dim bg-surface">
              <div>
                <h2 className="text-lg font-extrabold text-foreground">
                  {editingProduct ? `Ubah Produk: ${editingProduct.name}` : 'Tambah Produk Baru'}
                </h2>
                <p className="text-xs text-slate-500">Atur rincian katalog, resep takaran, dan penentuan harga jual.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-surface-dim bg-slate-50 px-6 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'info'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>1. Info Produk</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recipe')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'recipe'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wheat className="w-4 h-4" />
                <span>2. Resep Bahan ({recipeRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pricing')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'pricing'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>3. Kalkulator HPP & Harga</span>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* ================= TAB 1: INFORMASI PRODUK ================= */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Foto Produk */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 border border-surface-dim rounded-2xl">
                    <div className="w-16 h-16 bg-white border border-surface-dim rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                      {imagePreviewUrl ? (
                        <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <span className="text-xs font-bold text-slate-600 block">Foto Produk</span>
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
                          className="px-3 py-1 bg-white border border-surface-dim hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition cursor-pointer"
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
                            className="px-3 py-1 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Nama Produk & Kategori */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nama Produk <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Es Kopi Susu Aren"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Kategori</label>
                      <select
                        value={formCategoryId}
                        onChange={(e) => setFormCategoryId(e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-semibold transition cursor-pointer"
                      >
                        <option value="">Tanpa Kategori</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Harga Jual & Harga Modal Manual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Harga Jual di Kasir (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        placeholder="Contoh: 15000"
                        value={formPrice}
                        onChange={(e) => {
                          setFormPrice(e.target.value)
                          setFormSimulatedPrice(e.target.value)
                        }}
                        className="w-full px-4 py-3 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-bold text-primary transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Harga Modal / HPP per Porsi (Rp)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          readOnly={formUseRecipeCost}
                          placeholder={formUseRecipeCost ? 'Dihitung dari Resep' : 'Contoh: 8000'}
                          value={formUseRecipeCost ? Math.round(livePricing.totalCost).toString() : formManualCost}
                          onChange={(e) => setFormManualCost(e.target.value)}
                          className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                            formUseRecipeCost
                              ? 'bg-slate-100 border-surface-dim text-slate-500 cursor-not-allowed'
                              : 'bg-surface-container border-surface-dim focus:outline-none focus:border-primary text-slate-800'
                          }`}
                        />
                        {formUseRecipeCost && (
                          <span className="absolute right-3 top-3.5 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Otomatis Resep
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {formUseRecipeCost
                          ? 'HPP terkunci otomatis dari bahan resep & biaya operasional.'
                          : 'Bisa diisi manual atau susun di tab Resep & Kalkulator.'}
                      </p>
                    </div>
                  </div>

                  {/* Lacak Stok */}
                  <div className="pt-2 border-t border-surface-dim">
                    <label className="flex items-center space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formTrackStock}
                        onChange={(e) => setFormTrackStock(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Lacak Jumlah Stok Produk Jadi Ini
                      </span>
                    </label>

                    {formTrackStock && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-slate-600 mb-1">Jumlah Stok Saat Ini</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="Contoh: 50"
                          value={formStock}
                          onChange={(e) => setFormStock(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-container rounded-2xl border border-surface-dim text-sm font-semibold"
                        />
                      </div>
                    )}
                  </div>

                  {/* Deskripsi */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Produk (Opsional)</label>
                    <textarea
                      rows={2}
                      placeholder="Catatan porsi, varian, atau bahan utama..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-container rounded-2xl border border-surface-dim focus:outline-none focus:border-primary text-sm font-medium resize-none"
                    />
                  </div>
                </div>
              )}

              {/* ================= TAB 2: RESEP BAHAN ================= */}
              {activeTab === 'recipe' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Susunan Bahan Baku Produk</h4>
                      <p className="text-xs text-slate-500">Tentukan bahan mentah dan takaran per 1 porsi produk.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Bahan</span>
                    </button>
                  </div>

                  {isLoadingRecipe ? (
                    <div className="p-8 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <p className="text-xs">Memuat resep produk...</p>
                    </div>
                  ) : recipeRows.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-surface-dim border-dashed rounded-2xl">
                      <Wheat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-600">Belum ada resep bahan yang ditentukan</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                        Tambahkan bahan seperti kopi, gula, susu, cup, dll untuk menghitung modal otomatis.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddRecipeRow}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        + Tambah Bahan Resep
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recipeRows.map((row, idx) => {
                        const ingredient = ingredientsMap.get(row.ingredient_id)
                        const costPerUnit = ingredient
                          ? Number(ingredient.cost_per_unit) || (ingredient.purchase_qty > 0 ? ingredient.purchase_price / ingredient.purchase_qty : 0)
                          : 0
                        const subtotalRow = row.qty_used * costPerUnit

                        return (
                          <div
                            key={idx}
                            className="p-3 bg-surface-container rounded-2xl border border-surface-dim flex flex-col sm:flex-row sm:items-center gap-3"
                          >
                            {/* Select Ingredient */}
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Bahan #{idx + 1}
                              </label>
                              <select
                                value={row.ingredient_id}
                                onChange={(e) => handleUpdateRecipeRow(idx, 'ingredient_id', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-800 focus:border-primary outline-none cursor-pointer"
                              >
                                {initialIngredients.map((ing) => (
                                  <option key={ing.id} value={ing.id}>
                                    {ing.name} ({formatUnitCost(ing.cost_per_unit, ing.unit)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Takaran Qty */}
                            <div className="w-full sm:w-32">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Takaran ({ingredient?.unit || 'unit'})
                              </label>
                              <input
                                type="number"
                                min="0.001"
                                step="any"
                                value={row.qty_used}
                                onChange={(e) => handleUpdateRecipeRow(idx, 'qty_used', e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-800 focus:border-primary outline-none"
                              />
                            </div>

                            {/* Cost Subtotal */}
                            <div className="w-full sm:w-28 text-right">
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">Biaya Bahan</label>
                              <span className="text-xs font-black text-primary block py-1">
                                {formatRupiah(subtotalRow)}
                              </span>
                            </div>

                            {/* Delete Row */}
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipeRow(idx)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer self-end sm:self-center"
                              title="Hapus baris"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}

                      {/* Summary Box */}
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Total HPP Bahan Mentah:</span>
                          <span className="text-lg font-black text-primary">{formatRupiah(livePricing.recipeCost)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('pricing')}
                          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Lanjut ke Kalkulator Harga</span>
                          <TrendingUp className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 3: KALKULATOR HARGA JUAL & BEP ================= */}
              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  {/* Parameter Input (Biaya Lain, Waste, Target Margin) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-surface-dim">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Biaya Lain (Kemasan/Gas)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Contoh: 1000"
                        value={formOtherCost}
                        onChange={(e) => setFormOtherCost(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Buffer Rusak / Waste (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Contoh: 5"
                        value={formWastePercent}
                        onChange={(e) => setFormWastePercent(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Target Margin Laba (%)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        placeholder="Contoh: 30"
                        value={formTargetMargin}
                        onChange={(e) => setFormTargetMargin(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-surface-dim rounded-xl text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Summary Metric Breakdown Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-3 bg-surface-container rounded-2xl border border-surface-dim">
                      <span className="text-[10px] text-slate-500 font-bold block">1. HPP Variabel</span>
                      <span className="text-sm font-black text-slate-800">{formatRupiah(livePricing.variableCost)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Bahan + Kemasan + Waste</span>
                    </div>

                    <div className="p-3 bg-surface-container rounded-2xl border border-surface-dim">
                      <span className="text-[10px] text-slate-500 font-bold block">2. Beban Tetap/Porsi</span>
                      <span className="text-sm font-black text-slate-800">{formatRupiah(livePricing.fixedCostPerUnit)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Sewa & Penyusutan</span>
                    </div>

                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                      <span className="text-[10px] text-primary font-extrabold block">3. HPP Total / Porsi</span>
                      <span className="text-sm font-black text-primary">{formatRupiah(livePricing.totalCost)}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">Modal Keseluruhan</span>
                    </div>

                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-800 font-extrabold block">4. Harga Saran</span>
                      <span className="text-sm font-black text-emerald-800">{formatRupiah(livePricing.roundedSuggestedPrice)}</span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">Margin {formTargetMargin}%</span>
                    </div>
                  </div>

                  {/* Simulator Harga Jual Custom */}
                  <div className="p-4 bg-surface rounded-2xl border-2 border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-foreground flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-primary" />
                        Simulasi Harga Jual yang Diinginkan
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyCalculatedPrice(livePricing.roundedSuggestedPrice, livePricing.totalCost)}
                        className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        Gunakan Harga Saran ({formatRupiah(livePricing.roundedSuggestedPrice)})
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 relative">
                        <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                          type="number"
                          min="0"
                          step="100"
                          placeholder="Masukkan harga yang ingin Anda uji..."
                          value={formSimulatedPrice}
                          onChange={(e) => setFormSimulatedPrice(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-surface-container rounded-xl border border-surface-dim font-bold text-base focus:border-primary outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const testPrice = parseFloat(formSimulatedPrice) || livePricing.roundedSuggestedPrice
                          handleApplyCalculatedPrice(testPrice, livePricing.totalCost)
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                      >
                        Pakai Harga Ini
                      </button>
                    </div>

                    {/* Simulation Result Metrics */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-dim text-center">
                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">Laba per Porsi</span>
                        <span className={`text-xs font-extrabold ${livePricing.profitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {formatRupiah(livePricing.profitPerUnit)}
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">Margin Aktual</span>
                        <span className={`text-xs font-extrabold ${
                          livePricing.actualMarginPercent >= parseFloat(formTargetMargin)
                            ? 'text-emerald-700'
                            : livePricing.actualMarginPercent > 0
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}>
                          {Math.round(livePricing.actualMarginPercent)}%
                        </span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-500 font-bold block">Titik Impas (BEP)</span>
                        <span className="text-xs font-extrabold text-slate-800">
                          {livePricing.bepUnits !== null ? `${livePricing.bepUnits} porsi` : 'Rugi / Tak Tercapai'}
                        </span>
                      </div>
                    </div>

                    {/* Status Alert */}
                    {livePricing.isLoss && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Peringatan: Harga jual di bawah modal HPP total ({formatRupiah(livePricing.totalCost)}). Anda akan mengalami kerugian!</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-surface-dim">
                <div className="text-xs text-slate-500 font-semibold">
                  HPP: <strong className="text-slate-700">{formatRupiah(formUseRecipeCost ? livePricing.totalCost : (parseFloat(formManualCost) || 0))}</strong>
                  {' • '}
                  Jual: <strong className="text-primary">{formatRupiah(parseFloat(formPrice) || 0)}</strong>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>{editingProduct ? 'Simpan Perubahan' : 'Simpan Produk Baru'}</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
