create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role::text
  from public.profiles p
  where p.id = (select auth.uid())
  limit 1
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to authenticated;

do $$
declare
  conflicting_table text;
begin
  select table_number::text
  into conflicting_table
  from public.orders
  where order_type = 'DINE_IN' and status <> 'SELESAI'
  group by table_number
  having count(*) > 1
  limit 1;

  if conflicting_table is not null then
    raise exception 'Rapikan pesanan aktif duplikat pada meja % sebelum migration dijalankan',
      conflicting_table;
  end if;
end
$$;

create table if not exists public.business_settings (
  id boolean primary key default true check (id),
  name text not null default 'Ruma Umma',
  slogan text not null default 'Restoran Rumahan...',
  logo text not null default '🍛',
  updated_at timestamptz not null default now()
);

alter table public.business_settings
  add column if not exists name text not null default 'Ruma Umma',
  add column if not exists slogan text not null default 'Restoran Rumahan...',
  add column if not exists logo text not null default '🍛',
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_settings'
      and column_name = 'id'
      and udt_name = 'uuid'
  ) then
    if (select count(*) from public.business_settings) > 1 then
      raise exception 'business_settings memiliki lebih dari satu baris; rapikan data sebelum migration dijalankan';
    end if;

    alter table public.business_settings alter column id drop default;
    alter table public.business_settings
      alter column id type boolean using true;
    alter table public.business_settings alter column id set default true;
  end if;
end
$$;

insert into public.business_settings (id)
values (true)
on conflict (id) do nothing;

alter table public.business_settings enable row level security;
revoke all on public.business_settings from anon, authenticated;

create or replace function public.guard_active_dine_in_table()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.order_type = 'DINE_IN' and new.status <> 'SELESAI' then
    if new.table_number is null then
      raise exception 'Nomor meja wajib diisi untuk dine-in'
        using errcode = '23514';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(24816, new.table_number);

    if exists (
      select 1
      from public.orders o
      where o.table_number = new.table_number
        and o.order_type = 'DINE_IN'
        and o.status <> 'SELESAI'
        and o.id <> new.id
    ) then
      raise exception 'Meja % sedang memiliki pesanan aktif', new.table_number
        using errcode = '23505';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists guard_active_dine_in_table on public.orders;
create trigger guard_active_dine_in_table
before insert or update of table_number, order_type, status on public.orders
for each row execute function public.guard_active_dine_in_table();

create or replace function public.save_pos_order(
  p_order_id uuid,
  p_table_number integer,
  p_customer_name text,
  p_order_type text,
  p_total_price numeric,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid := coalesce(p_order_id, gen_random_uuid());
  v_item jsonb;
  v_item_id uuid;
  v_item_ids uuid[] := array[]::uuid[];
  v_existing_order public.orders%rowtype;
begin
  if p_items is null then
    raise exception 'Daftar item wajib diisi' using errcode = '22023';
  end if;
  if public.current_app_role() not in ('OWNER', 'STAFF') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if p_order_type is null
     or p_order_type not in ('DINE_IN', 'TAKEAWAY')
     or p_total_price is null
     or p_total_price < 0
     or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Data pesanan tidak valid' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Pesanan harus memiliki minimal satu item'
      using errcode = '22023';
  end if;
  if p_total_price <> (
    select coalesce(
      sum((item ->> 'unit_price')::numeric * (item ->> 'qty')::integer),
      0
    )
    from jsonb_array_elements(p_items) as items(item)
  ) then
    raise exception 'Total pesanan tidak sesuai rincian item'
      using errcode = '22023';
  end if;

  if p_order_type = 'DINE_IN' and p_table_number is null then
    raise exception 'Nomor meja wajib diisi untuk dine-in'
      using errcode = '22023';
  end if;
  if p_order_type = 'DINE_IN' and p_table_number not between 1 and 7 then
    raise exception 'Nomor meja harus antara 1 dan 7'
      using errcode = '22023';
  end if;

  if p_table_number is not null then
    perform pg_catalog.pg_advisory_xact_lock(24816, p_table_number);
  end if;

  if p_order_id is null then
    insert into public.orders (
      id, table_number, customer_name, order_type, status, total_price
    )
    values (
      v_order_id,
      case when p_order_type = 'TAKEAWAY' then null else p_table_number end,
      nullif(btrim(p_customer_name), ''),
      p_order_type,
      'DAPUR',
      p_total_price
    );
  else
    select * into v_existing_order
    from public.orders
    where id = p_order_id
    for update;

    if not found or v_existing_order.status = 'SELESAI' then
      raise exception 'Pesanan tidak ditemukan atau sudah selesai'
        using errcode = 'P0002';
    end if;

    update public.orders
    set table_number = case when p_order_type = 'TAKEAWAY' then null else p_table_number end,
        customer_name = nullif(btrim(p_customer_name), ''),
        order_type = p_order_type,
        status = 'DAPUR',
        total_price = p_total_price
    where id = p_order_id;
  end if;

  for v_item in
    select item
    from jsonb_array_elements(p_items) as items(item)
  loop
    if coalesce((v_item ->> 'qty')::integer, 0) <= 0
       or coalesce((v_item ->> 'unit_price')::numeric, -1) < 0
       or nullif(v_item ->> 'menu_name', '') is null
       or nullif(v_item ->> 'menu_item_id', '') is null
       or nullif(v_item ->> 'id', '') is null then
      raise exception 'Item pesanan tidak valid' using errcode = '22023';
    end if;

    v_item_id := (v_item ->> 'id')::uuid;
    if v_item_id = any(v_item_ids) then
      raise exception 'ID item pesanan duplikat' using errcode = '22023';
    end if;
    v_item_ids := array_append(v_item_ids, v_item_id);

    if v_item_id is not null and exists (
      select 1 from public.order_items
      where id = v_item_id and order_id = v_order_id
    ) then
      update public.order_items
      set menu_item_id = nullif(v_item ->> 'menu_item_id', '')::uuid,
          menu_name = v_item ->> 'menu_name',
          unit_price = (v_item ->> 'unit_price')::numeric,
          qty = (v_item ->> 'qty')::integer,
          notes = coalesce(v_item ->> 'notes', '')
      where id = v_item_id and order_id = v_order_id;
    else
      insert into public.order_items (
        id, order_id, menu_item_id, menu_name, unit_price, qty, notes
      )
      values (
        coalesce(v_item_id, gen_random_uuid()),
        v_order_id,
        nullif(v_item ->> 'menu_item_id', '')::uuid,
        v_item ->> 'menu_name',
        (v_item ->> 'unit_price')::numeric,
        (v_item ->> 'qty')::integer,
        coalesce(v_item ->> 'notes', '')
      );
    end if;
  end loop;

  delete from public.order_items oi
  where oi.order_id = v_order_id
    and not exists (
      select 1
      from jsonb_array_elements(p_items) as items(item)
      where nullif(item ->> 'id', '')::uuid = oi.id
    );

  return v_order_id;
end
$$;

create or replace function public.complete_pos_order_payment(
  p_order_id uuid,
  p_method text,
  p_amount_received numeric,
  p_change_amount numeric,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  if public.current_app_role() not in ('OWNER', 'STAFF') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if p_method is null
     or p_amount_received is null
     or p_change_amount is null
     or p_method not in ('CASH', 'QRIS', 'TRANSFER')
     or p_amount_received < 0
     or p_change_amount < 0 then
    raise exception 'Data pembayaran tidak valid' using errcode = '22023';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found or v_order.status = 'SELESAI' then
    raise exception 'Pesanan tidak ditemukan atau sudah dibayar'
      using errcode = 'P0002';
  end if;
  if p_amount_received < v_order.total_price
     or (p_method <> 'CASH' and p_amount_received <> v_order.total_price)
     or (p_method = 'CASH' and p_change_amount <> p_amount_received - v_order.total_price)
     or (p_method <> 'CASH' and p_change_amount <> 0) then
    raise exception 'Jumlah pembayaran tidak sesuai total pesanan'
      using errcode = '22023';
  end if;

  insert into public.payments (
    order_id, method, amount_received, change_amount, note
  )
  values (
    p_order_id, p_method, p_amount_received, p_change_amount,
    nullif(btrim(p_note), '')
  );

  update public.orders
  set status = 'SELESAI',
      completed_at = now()
  where id = p_order_id;
end
$$;

create or replace function public.set_pos_item_completed(
  p_item_id uuid,
  p_is_completed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() not in ('OWNER', 'STAFF') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  if p_item_id is null or p_is_completed is null then
    raise exception 'Status item tidak valid' using errcode = '22023';
  end if;
  update public.order_items
  set is_completed = p_is_completed
  where id = p_item_id
    and exists (
      select 1
      from public.orders o
      where o.id = public.order_items.order_id
        and o.status <> 'SELESAI'
    );
  if not found then
    raise exception 'Item pesanan tidak ditemukan' using errcode = 'P0002';
  end if;
end
$$;

create or replace function public.complete_pos_kitchen_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() not in ('OWNER', 'STAFF') then
    raise exception 'Akses ditolak' using errcode = '42501';
  end if;
  update public.order_items
  set is_completed = true
  where order_id = p_order_id;
  update public.orders
  set status = 'SIAP'
  where id = p_order_id and status <> 'SELESAI';
  if not found then
    raise exception 'Pesanan tidak ditemukan atau sudah selesai'
      using errcode = 'P0002';
  end if;
end
$$;

create or replace function public.delete_completed_pos_orders(p_order_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.current_app_role() <> 'OWNER' then
    raise exception 'Hanya OWNER yang dapat mereset riwayat'
      using errcode = '42501';
  end if;
  delete from public.payments
  where order_id in (
    select id from public.orders
    where id = any(p_order_ids) and status = 'SELESAI'
  );
  delete from public.order_items
  where order_id in (
    select id from public.orders
    where id = any(p_order_ids) and status = 'SELESAI'
  );
  delete from public.orders
  where id = any(p_order_ids) and status = 'SELESAI';
end
$$;

revoke all on function public.save_pos_order(uuid, integer, text, text, numeric, jsonb) from public;
revoke all on function public.complete_pos_order_payment(uuid, text, numeric, numeric, text) from public;
revoke all on function public.set_pos_item_completed(uuid, boolean) from public;
revoke all on function public.complete_pos_kitchen_order(uuid) from public;
revoke all on function public.delete_completed_pos_orders(uuid[]) from public;

grant execute on function public.save_pos_order(uuid, integer, text, text, numeric, jsonb) to authenticated;
grant execute on function public.complete_pos_order_payment(uuid, text, numeric, numeric, text) to authenticated;
grant execute on function public.set_pos_item_completed(uuid, boolean) to authenticated;
grant execute on function public.complete_pos_kitchen_order(uuid) to authenticated;
grant execute on function public.delete_completed_pos_orders(uuid[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.menu_items enable row level security;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array[
    'profiles', 'orders', 'order_items', 'payments', 'menu_items', 'business_settings'
  ]
  loop
    for policy_name in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$$;

create policy "profiles_read_self_or_owner"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.current_app_role() = 'OWNER');

create policy "orders_read_authenticated_role"
on public.orders for select to authenticated
using (public.current_app_role() in ('OWNER', 'STAFF'));

create policy "order_items_read_authenticated_role"
on public.order_items for select to authenticated
using (public.current_app_role() in ('OWNER', 'STAFF'));

create policy "payments_read_authenticated_role"
on public.payments for select to authenticated
using (public.current_app_role() in ('OWNER', 'STAFF'));

create policy "menu_items_read_authenticated_role"
on public.menu_items for select to authenticated
using (public.current_app_role() in ('OWNER', 'STAFF'));
create policy "menu_items_owner_insert"
on public.menu_items for insert to authenticated
with check (public.current_app_role() = 'OWNER');
create policy "menu_items_owner_update"
on public.menu_items for update to authenticated
using (public.current_app_role() = 'OWNER')
with check (public.current_app_role() = 'OWNER');
create policy "menu_items_owner_delete"
on public.menu_items for delete to authenticated
using (public.current_app_role() = 'OWNER');

create policy "business_settings_read_authenticated"
on public.business_settings for select to authenticated
using (public.current_app_role() in ('OWNER', 'STAFF'));
create policy "business_settings_owner_insert"
on public.business_settings for insert to authenticated
with check (public.current_app_role() = 'OWNER');
create policy "business_settings_owner_update"
on public.business_settings for update to authenticated
using (public.current_app_role() = 'OWNER')
with check (public.current_app_role() = 'OWNER');

revoke all on public.profiles, public.orders, public.order_items, public.payments, public.menu_items
from anon, authenticated;
grant select on public.profiles, public.orders, public.order_items, public.payments to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update on public.business_settings to authenticated;

create index if not exists orders_active_dine_in_table_idx
on public.orders (table_number)
where order_type = 'DINE_IN' and status <> 'SELESAI';
create index if not exists order_items_order_id_idx
on public.order_items (order_id);
create index if not exists payments_order_id_idx
on public.payments (order_id);

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read"
on storage.objects for select to public
using (bucket_id = 'menu-images');
drop policy if exists "menu_images_owner_insert" on storage.objects;
create policy "menu_images_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'menu-images'
  and public.current_app_role() = 'OWNER'
);
drop policy if exists "menu_images_owner_update" on storage.objects;
create policy "menu_images_owner_update"
on storage.objects for update to authenticated
using (bucket_id = 'menu-images' and public.current_app_role() = 'OWNER')
with check (bucket_id = 'menu-images' and public.current_app_role() = 'OWNER');
drop policy if exists "menu_images_owner_delete" on storage.objects;
create policy "menu_images_owner_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'menu-images' and public.current_app_role() = 'OWNER');

drop policy if exists "menu_images_restrict_insert" on storage.objects;
create policy "menu_images_restrict_insert"
on storage.objects as restrictive for insert to public
with check (
  bucket_id <> 'menu-images'
  or case
       when auth.role() = 'authenticated' then public.current_app_role() = 'OWNER'
       else false
     end
);
drop policy if exists "menu_images_restrict_update" on storage.objects;
create policy "menu_images_restrict_update"
on storage.objects as restrictive for update to public
using (
  bucket_id <> 'menu-images'
  or case
       when auth.role() = 'authenticated' then public.current_app_role() = 'OWNER'
       else false
     end
)
with check (
  bucket_id <> 'menu-images'
  or case
       when auth.role() = 'authenticated' then public.current_app_role() = 'OWNER'
       else false
     end
);
drop policy if exists "menu_images_restrict_delete" on storage.objects;
create policy "menu_images_restrict_delete"
on storage.objects as restrictive for delete to public
using (
  bucket_id <> 'menu-images'
  or case
       when auth.role() = 'authenticated' then public.current_app_role() = 'OWNER'
       else false
     end
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'orders', 'order_items', 'payments', 'menu_items', 'business_settings'
  ]
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$$;
