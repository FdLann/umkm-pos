/**
 * Engine Perhitungan HPP, Margin, dan Kalkulator Harga Jual POS UMKM
 * Modul fungsi murni (pure functions) yang aman terhadap pembagian nol dan input tidak valid.
 */

export interface RecipeItemCostInput {
  qty_used: number
  cost_per_unit: number
}

export interface PricingCalculationInput {
  recipeItems?: RecipeItemCostInput[]
  manualCost?: number
  useRecipeCost?: boolean
  otherCost?: number
  wastePercent?: number
  targetMargin?: number // Dalam persen (contoh: 30 untuk 30%)
  totalMonthlyFixedCost?: number // Total biaya tetap bulanan (operasional + penyusutan)
  targetMonthlySales?: number // Target porsi per bulan
  sellingPrice?: number // Harga jual aktual/simulasi (jika ingin dihitung laba & BEP-nya)
  roundingStep?: 100 | 500 | 1000
}

export interface PricingResult {
  recipeCost: number // HPP bahan mentah
  effectiveBaseCost: number // HPP yang dipakai (dari resep atau manual)
  otherCost: number // Biaya kemasan/gas/dll
  wastePercent: number // Buffer waste %
  wasteAmount: number // Nilai rupiah buffer waste
  variableCost: number // HPP Variabel per porsi
  fixedCostPerUnit: number // Alokasi biaya tetap per porsi
  totalCost: number // HPP Total per porsi (Variabel + Fixed)
  suggestedPrice: number // Harga jual saran murni
  roundedSuggestedPrice: number // Harga jual saran dibulatkan ke atas (default: Rp500)
  actualSellingPrice: number // Harga jual yang diuji/dipakai
  profitPerUnit: number // Laba per porsi (harga_jual - hpp_total)
  actualMarginPercent: number // Margin aktual % ((harga_jual - hpp_total) / harga_jual * 100)
  estimatedMonthlyProfit: number // Estimasi laba bulanan (laba_per_unit * target_monthly_sales)
  bepUnits: number | null // Break Even Point (titik impas dalam porsi/bulan)
  isLoss: boolean // True jika harga_jual < hpp_total
  isVariableLoss: boolean // True jika harga_jual <= hpp_variabel (tidak bisa nutup biaya variabel)
}

/**
 * Menghitung total HPP bahan baku dari resep
 */
export function calculateRecipeCost(items: RecipeItemCostInput[] = []): number {
  if (!Array.isArray(items) || items.length === 0) return 0

  return items.reduce((acc, item) => {
    const qty = Math.max(0, Number(item.qty_used) || 0)
    const cost = Math.max(0, Number(item.cost_per_unit) || 0)
    return acc + qty * cost
  }, 0)
}

/**
 * Pembulatan harga ke atas ke kelipatan terdekat (100, 500, atau 1000)
 */
export function roundUpPrice(price: number, step: 100 | 500 | 1000 = 500): number {
  const validPrice = Math.max(0, Number(price) || 0)
  if (validPrice === 0) return 0
  return Math.ceil(validPrice / step) * step
}

/**
 * Menghitung kalkulasi lengkap harga jual, HPP, margin, dan BEP
 */
export function calculatePricing(input: PricingCalculationInput): PricingResult {
  const {
    recipeItems = [],
    manualCost = 0,
    useRecipeCost = false,
    otherCost = 0,
    wastePercent = 5,
    targetMargin = 30,
    totalMonthlyFixedCost = 0,
    targetMonthlySales = 500,
    sellingPrice,
    roundingStep = 500,
  } = input

  // 1. Hitung HPP Bahan Dasar
  const rawRecipeCost = calculateRecipeCost(recipeItems)
  const safeManualCost = Math.max(0, Number(manualCost) || 0)
  const effectiveBaseCost = useRecipeCost ? rawRecipeCost : safeManualCost

  const safeOtherCost = Math.max(0, Number(otherCost) || 0)
  const safeWastePercent = Math.max(0, Number(wastePercent) || 0)

  // 2. HPP Variabel = (HPP Bahan + Biaya Lain) * (1 + Waste% / 100)
  const subtotalBeforeWaste = effectiveBaseCost + safeOtherCost
  const wasteAmount = subtotalBeforeWaste * (safeWastePercent / 100)
  const variableCost = subtotalBeforeWaste + wasteAmount

  // 3. Alokasi Biaya Tetap per Porsi
  const safeFixedCost = Math.max(0, Number(totalMonthlyFixedCost) || 0)
  const safeTargetSales = Math.max(1, Number(targetMonthlySales) || 1)
  const fixedCostPerUnit = safeFixedCost / safeTargetSales

  // 4. HPP Total = HPP Variabel + Biaya Tetap per Porsi
  const totalCost = variableCost + fixedCostPerUnit

  // 5. Harga Jual Saran = HPP Total / (1 - Target Margin% / 100)
  const safeMargin = Number(targetMargin) || 0
  let suggestedPrice = totalCost
  if (safeMargin >= 100) {
    // Jika margin 100% atau lebih, gunakan fallback totalCost * 2 untuk mencegah divide by zero / infinity
    suggestedPrice = totalCost * 2
  } else if (safeMargin > 0) {
    suggestedPrice = totalCost / (1 - safeMargin / 100)
  }

  const roundedSuggestedPrice = roundUpPrice(suggestedPrice, roundingStep)

  // 6. Evaluasi Harga Jual Aktual/Simulasi
  // Jika sellingPrice tidak diset, gunakan harga saran yang dibulatkan
  const actualSellingPrice = sellingPrice !== undefined ? Math.max(0, Number(sellingPrice) || 0) : roundedSuggestedPrice

  const profitPerUnit = actualSellingPrice - totalCost
  const actualMarginPercent = actualSellingPrice > 0 ? (profitPerUnit / actualSellingPrice) * 100 : 0
  const estimatedMonthlyProfit = profitPerUnit * safeTargetSales

  // 7. Perhitungan BEP (Break Even Point dalam unit/porsi per bulan)
  // BEP = Total Biaya Tetap / (Harga Jual - HPP Variabel)
  const contributionMargin = actualSellingPrice - variableCost
  let bepUnits: number | null = null
  let isVariableLoss = false

  if (contributionMargin <= 0) {
    isVariableLoss = true
    bepUnits = null // Harga di bawah biaya variabel per porsi, tidak akan pernah BEP
  } else if (safeFixedCost === 0) {
    bepUnits = 0
  } else {
    bepUnits = Math.ceil(safeFixedCost / contributionMargin)
  }

  const isLoss = actualSellingPrice < totalCost

  return {
    recipeCost: rawRecipeCost,
    effectiveBaseCost,
    otherCost: safeOtherCost,
    wastePercent: safeWastePercent,
    wasteAmount,
    variableCost,
    fixedCostPerUnit,
    totalCost,
    suggestedPrice,
    roundedSuggestedPrice,
    actualSellingPrice,
    profitPerUnit,
    actualMarginPercent,
    estimatedMonthlyProfit,
    bepUnits,
    isLoss,
    isVariableLoss,
  }
}

/**
 * Menghitung penyusutan alat per bulan
 * Rumus: (Harga Beli - Nilai Sisa) / Umur Pakai (Bulan)
 */
export function calculateDepreciation(purchasePrice: number, salvageValue: number = 0, usefulLifeMonths: number): number {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const safeSalvage = Math.max(0, Number(salvageValue) || 0)
  const safeMonths = Math.max(1, Number(usefulLifeMonths) || 1)

  const depreciableAmount = Math.max(0, safePrice - safeSalvage)
  return depreciableAmount / safeMonths
}

/**
 * Format angka ke mata uang Rupiah (contoh: "Rp16.000")
 */
export function formatRupiah(amount: number): string {
  const safeAmount = Math.round(Number(amount) || 0)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount).replace(/\s/g, '')
}

/**
 * Format angka desimal untuk satuan biaya (contoh: "Rp16,50 / gram")
 */
export function formatUnitCost(costPerUnit: number, unit: string): string {
  const safeCost = Number(costPerUnit) || 0
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: safeCost % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(safeCost)
  return `Rp${formatted} / ${unit}`
}
