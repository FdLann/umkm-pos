-- ==============================================================================
-- SQL MIGRASI TAHAP 1: BAHAN BAKU, RESEP, HPP, BIAYA TETAP & KALKULATOR HARGA JUAL
-- Salin dan jalankan script ini di SQL Editor Supabase Anda.
-- ==============================================================================

-- 1. Buat Tabel INGREDIENTS (Bahan Baku per Store)
create table if not exists public.ingredients (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  unit text not null, -- 'gram', 'ml', 'pcs', 'lembar', 'sdm', 'sdt', dll
  purchase_price numeric not null check (purchase_price >= 0),
  purchase_qty numeric not null check (purchase_qty > 0),
  cost_per_unit numeric generated always as (purchase_price / nullif(purchase_qty, 0)) stored,
  stock numeric default 0 check (stock >= 0),
  min_stock numeric default 0 check (min_stock >= 0),
  track_stock boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Buat Tabel RECIPE_ITEMS (Bahan Resep per Produk)
create table if not exists public.recipe_items (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  ingredient_id uuid references public.ingredients(id) on delete cascade not null,
  qty_used numeric not null check (qty_used > 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_product_ingredient unique(product_id, ingredient_id)
);

-- 3. Tambah Kolom HPP & Konfigurasi Harga pada Tabel PRODUCTS
alter table public.products
  add column if not exists cost numeric default 0 check (cost >= 0),
  add column if not exists other_cost numeric default 0 check (other_cost >= 0),
  add column if not exists waste_percent numeric default 5 check (waste_percent >= 0),
  add column if not exists target_margin numeric default 30 check (target_margin >= 0),
  add column if not exists use_recipe_cost boolean default false not null;

-- 4. Buat Tabel FIXED_COSTS (Biaya Tetap Operasional & Penyusutan Alat)
create table if not exists public.fixed_costs (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  amount numeric not null check (amount >= 0),
  type text not null check (type in ('bulanan', 'penyusutan')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tambah Kolom Target Penjualan Bulanan pada Tabel STORES
alter table public.stores
  add column if not exists target_monthly_sales integer default 500 check (target_monthly_sales > 0);

-- ==============================================================================
-- INDEXES UNTUK KECEPATAN QUERY
-- ==============================================================================
create index if not exists idx_ingredients_store on public.ingredients(store_id);
create index if not exists idx_recipe_items_store on public.recipe_items(store_id);
create index if not exists idx_recipe_items_product on public.recipe_items(product_id);
create index if not exists idx_recipe_items_ingredient on public.recipe_items(ingredient_id);
create index if not exists idx_fixed_costs_store on public.fixed_costs(store_id);

-- ==============================================================================
-- TRIGGER UPDATE UPDATED_AT PADA INGREDIENTS
-- ==============================================================================
create trigger update_ingredients_updated_at before update on public.ingredients
  for each row execute procedure public.update_updated_at_column();

-- ==============================================================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================
alter table public.ingredients enable row level security;
alter table public.recipe_items enable row level security;
alter table public.fixed_costs enable row level security;

-- ==============================================================================
-- DEFINISI POLICIES RLS
-- ==============================================================================

-- A. Ingredients Policies
create policy "Store owners can view own ingredients" on public.ingredients
  for select using (
    exists (select 1 from public.stores where stores.id = ingredients.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert ingredients" on public.ingredients
  for insert with check (
    exists (select 1 from public.stores where stores.id = ingredients.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update ingredients" on public.ingredients
  for update using (
    exists (select 1 from public.stores where stores.id = ingredients.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete ingredients" on public.ingredients
  for delete using (
    exists (select 1 from public.stores where stores.id = ingredients.store_id and stores.owner_id = auth.uid())
  );

-- B. Recipe Items Policies
create policy "Store owners can view own recipe items" on public.recipe_items
  for select using (
    exists (select 1 from public.stores where stores.id = recipe_items.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert recipe items" on public.recipe_items
  for insert with check (
    exists (select 1 from public.stores where stores.id = recipe_items.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update recipe items" on public.recipe_items
  for update using (
    exists (select 1 from public.stores where stores.id = recipe_items.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete recipe items" on public.recipe_items
  for delete using (
    exists (select 1 from public.stores where stores.id = recipe_items.store_id and stores.owner_id = auth.uid())
  );

-- C. Fixed Costs Policies
create policy "Store owners can view own fixed costs" on public.fixed_costs
  for select using (
    exists (select 1 from public.stores where stores.id = fixed_costs.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert fixed costs" on public.fixed_costs
  for insert with check (
    exists (select 1 from public.stores where stores.id = fixed_costs.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update fixed costs" on public.fixed_costs
  for update using (
    exists (select 1 from public.stores where stores.id = fixed_costs.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete fixed costs" on public.fixed_costs
  for delete using (
    exists (select 1 from public.stores where stores.id = fixed_costs.store_id and stores.owner_id = auth.uid())
  );
