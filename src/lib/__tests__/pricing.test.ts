import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateRecipeCost,
  calculatePricing,
  calculateDepreciation,
  roundUpPrice,
  formatRupiah,
  formatUnitCost,
} from '../pricing'

describe('Engine Kalkulasi HPP & Harga Jual (src/lib/pricing.ts)', () => {
  // 1. Uji Kalkulasi HPP Resep Bahan
  describe('calculateRecipeCost', () => {
    test('menghitung total HPP bahan normal dengan benar', () => {
      const items = [
        { qty_used: 20, cost_per_unit: 16 }, // Gula: 20g * Rp16 = Rp320
        { qty_used: 15, cost_per_unit: 100 }, // Kopi: 15g * Rp100 = Rp1500
        { qty_used: 100, cost_per_unit: 20 }, // Susu: 100ml * Rp20 = Rp2000
      ]
      const total = calculateRecipeCost(items)
      assert.equal(total, 3820)
    })

    test('menangani resep kosong dan input tidak valid', () => {
      assert.equal(calculateRecipeCost([]), 0)
      assert.equal(calculateRecipeCost(undefined as unknown as []), 0)
      assert.equal(calculateRecipeCost([{ qty_used: -5, cost_per_unit: 10 }]), 0)
    })
  })

  // 2. Uji Pembulatan Harga
  describe('roundUpPrice', () => {
    test('membulatkan ke atas ke kelipatan 500 terdekat', () => {
      assert.equal(roundUpPrice(7100, 500), 7500)
      assert.equal(roundUpPrice(7500, 500), 7500)
      assert.equal(roundUpPrice(7501, 500), 8000)
      assert.equal(roundUpPrice(0, 500), 0)
    })

    test('membulatkan ke atas ke kelipatan 100 dan 1000', () => {
      assert.equal(roundUpPrice(7120, 100), 7200)
      assert.equal(roundUpPrice(7100, 1000), 8000)
    })
  })

  // 3. Uji Kalkulasi Depresiasi / Penyusutan Alat
  describe('calculateDepreciation', () => {
    test('menghitung penyusutan alat per bulan dengan benar', () => {
      // Mesin Kopi Rp3.600.000, nilai sisa Rp600.000, umur 36 bulan (3 tahun)
      // Penyusutan = (3.600.000 - 600.000) / 36 = Rp83.333,33 / bulan
      const monthly = calculateDepreciation(3600000, 600000, 36)
      assert.equal(Math.round(monthly), 83333)
    })

    test('menangani umur pakai 0 atau negatif tanpa division by zero', () => {
      const result = calculateDepreciation(1000000, 0, 0)
      assert.equal(result, 1000000) // Default fallback 1 bulan
    })
  })

  // 4. Uji Kalkulasi Harga Jual Lengkap (calculatePricing)
  describe('calculatePricing', () => {
    test('skenario standar: resep kopi susu dengan biaya lain, waste, fixed cost, dan margin 30%', () => {
      const recipeItems = [
        { qty_used: 20, cost_per_unit: 16 }, // Rp320
        { qty_used: 15, cost_per_unit: 100 }, // Rp1500
        { qty_used: 100, cost_per_unit: 20 }, // Rp2000
      ] // Total bahan = Rp3.820

      const result = calculatePricing({
        recipeItems,
        useRecipeCost: true,
        otherCost: 1000, // Cup + sedotan + gas
        wastePercent: 5, // 5% buffer
        targetMargin: 30, // Target margin 30%
        totalMonthlyFixedCost: 500000, // Sewa & listrik Rp500.000/bln
        targetMonthlySales: 500, // Target 500 porsi/bln -> Fixed per unit = Rp1.000
        roundingStep: 500,
      })

      // HPP Bahan = 3.820
      assert.equal(result.recipeCost, 3820)
      // Subtotal sebelum waste = 3.820 + 1.000 = 4.820
      // Waste = 4.820 * 0.05 = 241
      // HPP Variabel = 4.820 + 241 = 5.061
      assert.equal(result.variableCost, 5061)
      // Fixed per unit = 500.000 / 500 = 1.000
      assert.equal(result.fixedCostPerUnit, 1000)
      // HPP Total = 5.061 + 1.000 = 6.061
      assert.equal(result.totalCost, 6061)

      // Harga Saran murni = 6.061 / (1 - 0.3) = 6.061 / 0.7 = 8.658,57
      assert.equal(Math.round(result.suggestedPrice), 8659)
      // Harga Saran bulat (kelipatan 500) = 9.000
      assert.equal(result.roundedSuggestedPrice, 9000)

      // Laba per unit jika dijual Rp9.000 = 9.000 - 6.061 = 2.939
      assert.equal(result.profitPerUnit, 2939)
      // Margin aktual % = (2.939 / 9.000) * 100 = 32.65%
      assert.equal(Math.round(result.actualMarginPercent * 100) / 100, 32.66)
      // Estimasi laba bulanan = 2.939 * 500 = 1.469.500
      assert.equal(result.estimatedMonthlyProfit, 1469500)

      // BEP Unit = 500.000 / (9.000 - 5.061) = 500.000 / 3.939 = 126.93 -> 127 porsi
      assert.equal(result.bepUnits, 127)
      assert.equal(result.isLoss, false)
      assert.equal(result.isVariableLoss, false)
    })

    test('skenario produk tanpa resep (manual HPP)', () => {
      const result = calculatePricing({
        manualCost: 5000,
        useRecipeCost: false,
        otherCost: 500,
        wastePercent: 0,
        targetMargin: 20,
        totalMonthlyFixedCost: 200000,
        targetMonthlySales: 400, // Fixed cost per unit = 500
        roundingStep: 500,
      })

      // HPP Total = (5.000 + 500) + 500 = 6.000
      assert.equal(result.totalCost, 6000)
      // Harga saran = 6.000 / 0.8 = 7.500
      assert.equal(result.roundedSuggestedPrice, 7500)
    })

    test('skenario margin 0%', () => {
      const result = calculatePricing({
        manualCost: 10000,
        useRecipeCost: false,
        targetMargin: 0,
        totalMonthlyFixedCost: 0,
        targetMonthlySales: 100,
        roundingStep: 100,
      })
      // Biaya total = 10000 + 5% waste = 10500
      assert.equal(result.suggestedPrice, 10500)
      assert.equal(result.roundedSuggestedPrice, 10500)
    })

    test('skenario margin ekstrem (>= 100%) tidak crash atau infinite', () => {
      const result = calculatePricing({
        manualCost: 10000,
        useRecipeCost: false,
        targetMargin: 100,
        totalMonthlyFixedCost: 0,
      })
      assert.ok(Number.isFinite(result.suggestedPrice))
      assert.ok(result.suggestedPrice > 0)
    })

    test('skenario harga di bawah HPP variabel (rugi dan BEP tidak tercapai)', () => {
      const result = calculatePricing({
        manualCost: 10000,
        useRecipeCost: false,
        totalMonthlyFixedCost: 500000,
        sellingPrice: 8000, // Dijual 8.000 padahal HPP variabel > 10.000
      })

      assert.equal(result.isLoss, true)
      assert.equal(result.isVariableLoss, true)
      assert.equal(result.bepUnits, null) // Tidak akan pernah BEP
      assert.ok(result.profitPerUnit < 0)
    })

    test('skenario target penjualan 0 tidak menyebabkan divide by zero', () => {
      const result = calculatePricing({
        manualCost: 5000,
        totalMonthlyFixedCost: 100000,
        targetMonthlySales: 0, // 0 sales
      })
      assert.ok(Number.isFinite(result.totalCost))
      assert.ok(Number.isFinite(result.fixedCostPerUnit))
    })
  })

  // 5. Uji Helper Formatter Rupiah
  describe('Formatters', () => {
    test('formatRupiah memformat uang Indonesia dengan benar', () => {
      assert.equal(formatRupiah(16000), 'Rp16.000')
      assert.equal(formatRupiah(0), 'Rp0')
    })

    test('formatUnitCost memformat biaya per satuan', () => {
      assert.equal(formatUnitCost(16, 'gram'), 'Rp16 / gram')
      assert.equal(formatUnitCost(16.5, 'gram'), 'Rp16,50 / gram')
    })
  })
})
