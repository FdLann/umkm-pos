-- ==========================================
-- SQL MIGRASI UNTUK DATABASE POS UMKM
-- Salin dan jalankan script ini di SQL Editor Supabase Anda.
-- ==========================================

-- 1. Buat Tabel PROFILES (Sync dengan Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Buat Tabel STORES (Toko)
create table public.stores (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Buat Tabel CATEGORIES (Kategori per Store)
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_store_category_name unique(store_id, name)
);

-- 4. Buat Tabel PRODUCTS (Produk per Store)
create table public.products (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price bigint not null check (price >= 0),
  stock integer check (stock >= 0), -- NULL berarti stok tidak dilacak (unlimited)
  image_url text,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Buat Tabel TRANSACTIONS (Ringkasan Transaksi)
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  transaction_number text not null unique,
  total_amount bigint not null check (total_amount >= 0),
  payment_method text not null check (payment_method in ('CASH', 'QRIS')),
  paid_amount bigint not null check (paid_amount >= 0),
  change_amount bigint not null check (change_amount >= 0),
  status text default 'COMPLETED' not null check (status in ('COMPLETED', 'PENDING', 'CANCELLED')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Buat Tabel TRANSACTION_ITEMS (Snapshot Detail Item Transaksi)
create table public.transaction_items (
  id uuid default gen_random_uuid() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  price_snapshot bigint not null check (price_snapshot >= 0),
  quantity integer not null check (quantity > 0),
  subtotal bigint not null check (subtotal >= 0)
);

-- ==========================================
-- INDEXES UNTUK OPTIMASI QUERY
-- ==========================================
create index idx_stores_owner on public.stores(owner_id);
create index idx_categories_store on public.categories(store_id);
create index idx_products_store on public.products(store_id);
create index idx_products_category on public.products(category_id);
create index idx_transactions_store on public.transactions(store_id);
create index idx_transaction_items_trx on public.transaction_items(transaction_id);

-- ==========================================
-- TRIGGER UNTUK UPDATE UPDATED_AT TIMESTAMP
-- ==========================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_stores_updated_at before update on public.stores
  for each row execute procedure public.update_updated_at_column();

create trigger update_products_updated_at before update on public.products
  for each row execute procedure public.update_updated_at_column();

-- ==========================================
-- TRIGGER UNTUK LINK AUTH.USERS KE PUBLIC.PROFILES
-- ==========================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Pengguna Baru'),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger ini akan aktif setelah baris baru ditambahkan ke auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- AKTIFKAN ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;

-- ==========================================
-- DEFINISI POLICIES UNTUK MASING-MASING TABEL
-- ==========================================

-- A. Profiles Policies
create policy "User can view own profile" on public.profiles
  for select using (id = auth.uid());

create policy "User can update own profile" on public.profiles
  for update using (id = auth.uid());

-- B. Stores Policies
create policy "Owner can view own store" on public.stores
  for select using (owner_id = auth.uid());

create policy "Owner can insert own store" on public.stores
  for insert with check (owner_id = auth.uid());

create policy "Owner can update own store" on public.stores
  for update using (owner_id = auth.uid());

-- C. Categories Policies
create policy "Store owners can view own categories" on public.categories
  for select using (
    exists (select 1 from public.stores where stores.id = categories.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert categories" on public.categories
  for insert with check (
    exists (select 1 from public.stores where stores.id = categories.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update categories" on public.categories
  for update using (
    exists (select 1 from public.stores where stores.id = categories.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete categories" on public.categories
  for delete using (
    exists (select 1 from public.stores where stores.id = categories.store_id and stores.owner_id = auth.uid())
  );

-- D. Products Policies
create policy "Store owners can view own products" on public.products
  for select using (
    exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert products" on public.products
  for insert with check (
    exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update products" on public.products
  for update using (
    exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete products" on public.products
  for delete using (
    exists (select 1 from public.stores where stores.id = products.store_id and stores.owner_id = auth.uid())
  );

-- E. Transactions Policies
create policy "Store owners can view own transactions" on public.transactions
  for select using (
    exists (select 1 from public.stores where stores.id = transactions.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can insert transactions" on public.transactions
  for insert with check (
    exists (select 1 from public.stores where stores.id = transactions.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can update transactions" on public.transactions
  for update using (
    exists (select 1 from public.stores where stores.id = transactions.store_id and stores.owner_id = auth.uid())
  );

create policy "Store owners can delete transactions" on public.transactions
  for delete using (
    exists (select 1 from public.stores where stores.id = transactions.store_id and stores.owner_id = auth.uid())
  );

-- F. Transaction Items Policies
create policy "Store owners can view own transaction items" on public.transaction_items
  for select using (
    exists (
      select 1 from public.transactions
      join public.stores on transactions.store_id = stores.id
      where transactions.id = transaction_items.transaction_id and stores.owner_id = auth.uid()
    )
  );

create policy "Store owners can insert transaction items" on public.transaction_items
  for insert with check (
    exists (
      select 1 from public.transactions
      join public.stores on transactions.store_id = stores.id
      where transactions.id = transaction_items.transaction_id and stores.owner_id = auth.uid()
    )
  );

create policy "Store owners can update transaction items" on public.transaction_items
  for update using (
    exists (
      select 1 from public.transactions
      join public.stores on transactions.store_id = stores.id
      where transactions.id = transaction_items.transaction_id and stores.owner_id = auth.uid()
    )
  );

create policy "Store owners can delete transaction items" on public.transaction_items
  for delete using (
    exists (
      select 1 from public.transactions
      join public.stores on transactions.store_id = stores.id
      where transactions.id = transaction_items.transaction_id and stores.owner_id = auth.uid()
    )
  );

-- ==========================================
-- KEAMANAN SUPABASE STORAGE (BUCKET: product-images)
-- ==========================================

-- Pastikan bucket 'product-images' terdaftar di storage.buckets
insert into storage.buckets (id, name, public) 
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 1. Izin membaca (Public Read)
create policy "Public read access to product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- 2. Izin mengunggah file (Hanya user terautentikasi)
create policy "Allow authenticated upload"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images' 
    and auth.role() = 'authenticated'
  );

-- 3. Izin memperbarui file (Hanya user terautentikasi)
create policy "Allow authenticated update"
  on storage.objects for update
  using (
    bucket_id = 'product-images' 
    and auth.role() = 'authenticated'
  );

-- 4. Izin menghapus file (Hanya user terautentikasi)
create policy "Allow authenticated delete"
  on storage.objects for delete
  using (
    bucket_id = 'product-images' 
    and auth.role() = 'authenticated'
  );


-- ==========================================
-- FUNCTION RPC: CHECKOUT TRANSAKSI ATOMIK
-- Jalankan ini agar Server Action kasir bisa checkout secara aman & atomik.
-- ==========================================

create or replace function public.checkout_transaction(
  p_store_id uuid,
  p_payment_method text,
  p_paid_amount bigint,
  p_change_amount bigint,
  p_items jsonb -- Array data json dari {product_id: uuid, quantity: int}
) returns jsonb as $$
declare
  v_transaction_id uuid;
  v_transaction_number text;
  v_total_amount bigint := 0;
  v_item record;
  v_product_price bigint;
  v_product_name text;
  v_product_stock int;
  v_subtotal bigint;
  v_current_date text;
  v_today_count bigint;
begin
  -- 1. Generate Nomor Transaksi (TRX-YYYYMMDD-XXXX)
  v_current_date := to_char(now(), 'YYYYMMDD');
  select count(*) + 1 into v_today_count 
  from public.transactions 
  where store_id = p_store_id and to_char(created_at, 'YYYYMMDD') = v_current_date;
  
  v_transaction_number := 'TRX-' || v_current_date || '-' || lpad(v_today_count::text, 4, '0');

  -- Hitung total belanja riil dan validasi stok di server (Row lock: FOR UPDATE)
  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity int)
  loop
    select name, price, stock into v_product_name, v_product_price, v_product_stock
    from public.products
    where id = v_item.product_id and store_id = p_store_id
    for update; -- Mengunci baris produk ini agar tidak terjadi balapan stok (race condition)

    if not found then
      raise exception 'Produk dengan ID % tidak ditemukan.', v_item.product_id;
    end if;

    -- Validasi kecukupan stok (jika stock tidak NULL)
    if v_product_stock is not null then
      if v_product_stock < v_item.quantity then
        raise exception 'Stok produk "%" tidak mencukupi. Tersedia: %, Diminta: %', v_product_name, v_product_stock, v_item.quantity;
      end if;
    end if;

    v_subtotal := v_product_price * v_item.quantity;
    v_total_amount := v_total_amount + v_subtotal;
  end loop;

  -- Validasi jumlah pembayaran jika metode tunai (CASH)
  if p_payment_method = 'CASH' and p_paid_amount < v_total_amount then
    raise exception 'Uang pembayaran kurang. Total: %, Dibayar: %', v_total_amount, p_paid_amount;
  end if;

  -- 2. Tambahkan baris baru ke Transactions
  insert into public.transactions (
    store_id,
    transaction_number,
    total_amount,
    payment_method,
    paid_amount,
    change_amount,
    status
  ) values (
    p_store_id,
    v_transaction_number,
    v_total_amount,
    p_payment_method,
    p_paid_amount,
    case when p_payment_method = 'CASH' then p_paid_amount - v_total_amount else 0 end,
    'COMPLETED'
  ) returning id into v_transaction_id;

  -- 3. Tambahkan detail items transaksi snapshot & potong stok produk jika dilacak
  for v_item in select * from jsonb_to_recordset(p_items) as x(product_id uuid, quantity int)
  loop
    select name, price, stock into v_product_name, v_product_price, v_product_stock
    from public.products
    where id = v_item.product_id and store_id = p_store_id;

    v_subtotal := v_product_price * v_item.quantity;

    -- Insert snapshot item
    insert into public.transaction_items (
      transaction_id,
      product_id,
      product_name_snapshot,
      price_snapshot,
      quantity,
      subtotal
    ) values (
      v_transaction_id,
      v_item.product_id,
      v_product_name,
      v_product_price,
      v_item.quantity,
      v_subtotal
    );

    -- Potong stok jika stock tidak NULL
    if v_product_stock is not null then
      update public.products
      set stock = stock - v_item.quantity
      where id = v_item.product_id;
    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'transaction_number', v_transaction_number,
    'total_amount', v_total_amount,
    'change_amount', case when p_payment_method = 'CASH' then p_paid_amount - v_total_amount else 0 end
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end;
$$ language plpgsql security definer;


-- ========================================================
-- RPC FUNCTION: REKAPAN PENJUALAN HARIAN
-- ========================================================
create or replace function public.get_daily_rekap(p_store_id uuid)
returns table(rekap_date date, transaction_count bigint, total_revenue bigint) as $$
begin
  return query
  select 
    created_at::date as rekap_date,
    count(id) as transaction_count,
    sum(total_amount)::bigint as total_revenue
  from public.transactions
  where store_id = p_store_id and status = 'COMPLETED'
  group by created_at::date
  order by rekap_date desc;
end;
$$ language plpgsql security definer;


-- ========================================================
-- RPC FUNCTION: REKAPAN PENJUALAN BULANAN
-- ========================================================
create or replace function public.get_monthly_rekap(p_store_id uuid)
returns table(rekap_month text, transaction_count bigint, total_revenue bigint) as $$
begin
  return query
  select 
    to_char(created_at, 'YYYY-MM') as rekap_month,
    count(id) as transaction_count,
    sum(total_amount)::bigint as total_revenue
  from public.transactions
  where store_id = p_store_id and status = 'COMPLETED'
  group by to_char(created_at, 'YYYY-MM')
  order by rekap_month desc;
end;
$$ language plpgsql security definer;
