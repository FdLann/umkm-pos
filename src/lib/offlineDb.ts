const DB_NAME = 'pos_umkm_offline_db';
const DB_VERSION = 2;

export function initOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      
      // Store untuk antrean transaksi offline
      if (!db.objectStoreNames.contains('transactions_queue')) {
        db.createObjectStore('transactions_queue', { keyPath: 'id' });
      }

      // Store untuk cache produk offline
      if (!db.objectStoreNames.contains('products_cache')) {
        db.createObjectStore('products_cache', { keyPath: 'id' });
      }

      // Store untuk cache kategori offline
      if (!db.objectStoreNames.contains('categories_cache')) {
        db.createObjectStore('categories_cache', { keyPath: 'id' });
      }

      // Store untuk cache bahan baku offline
      if (!db.objectStoreNames.contains('ingredients_cache')) {
        db.createObjectStore('ingredients_cache', { keyPath: 'id' });
      }

      // Store untuk cache biaya tetap offline
      if (!db.objectStoreNames.contains('fixed_costs_cache')) {
        db.createObjectStore('fixed_costs_cache', { keyPath: 'id' });
      }
    };
  });
}

// Tambah transaksi ke antrean offline
export async function queueOfflineTransaction(transaction: any): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions_queue', 'readwrite');
    const store = tx.objectStore('transactions_queue');
    const request = store.put(transaction);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Ambil semua transaksi offline dari antrean
export async function getOfflineTransactions(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions_queue', 'readonly');
    const store = tx.objectStore('transactions_queue');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Hapus transaksi dari antrean offline (setelah sukses disinkronkan)
export async function removeOfflineTransaction(id: string): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions_queue', 'readwrite');
    const store = tx.objectStore('transactions_queue');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Simpan cache produk
export async function cacheProducts(products: any[]): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readwrite');
    const store = tx.objectStore('products_cache');
    
    // Bersihkan cache lama
    store.clear();

    products.forEach((p) => {
      store.put(p);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Ambil cache produk
export async function getCachedProducts(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('products_cache', 'readonly');
    const store = tx.objectStore('products_cache');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Simpan cache kategori
export async function cacheCategories(categories: any[]): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories_cache', 'readwrite');
    const store = tx.objectStore('categories_cache');
    
    // Bersihkan cache lama
    store.clear();

    categories.forEach((c) => {
      store.put(c);
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Ambil cache kategori
export async function getCachedCategories(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories_cache', 'readonly');
    const store = tx.objectStore('categories_cache');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Simpan cache bahan baku
export async function cacheIngredients(ingredients: any[]): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ingredients_cache', 'readwrite');
    const store = tx.objectStore('ingredients_cache');
    store.clear();
    ingredients.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Ambil cache bahan baku
export async function getCachedIngredients(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('ingredients_cache', 'readonly');
    const store = tx.objectStore('ingredients_cache');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Simpan cache biaya tetap
export async function cacheFixedCosts(fixedCosts: any[]): Promise<void> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fixed_costs_cache', 'readwrite');
    const store = tx.objectStore('fixed_costs_cache');
    store.clear();
    fixedCosts.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Ambil cache biaya tetap
export async function getCachedFixedCosts(): Promise<any[]> {
  const db = await initOfflineDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fixed_costs_cache', 'readonly');
    const store = tx.objectStore('fixed_costs_cache');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
