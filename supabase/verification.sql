select
  c.relname as table_name,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'orders',
    'order_items',
    'payments',
    'menu_items',
    'business_settings'
  )
order by c.relname;

select
  required.table_name,
  exists (
    select 1
    from pg_publication_tables published
    where published.pubname = 'supabase_realtime'
      and published.schemaname = 'public'
      and published.tablename = required.table_name
  ) as realtime_enabled
from (
  values
    ('orders'),
    ('order_items'),
    ('payments'),
    ('menu_items'),
    ('business_settings')
) as required(table_name)
order by required.table_name;

select
  required.function_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = required.function_name
  ) as function_installed
from (
  values
    ('save_pos_order'),
    ('complete_pos_order_payment'),
    ('set_pos_item_completed'),
    ('complete_pos_kitchen_order'),
    ('delete_completed_pos_orders')
) as required(function_name)
order by required.function_name;

select
  id as storage_bucket,
  public as bucket_is_public
from storage.buckets
where id = 'menu-images';

select
  table_number,
  count(*) as active_order_count
from public.orders
where order_type = 'DINE_IN'
  and status <> 'SELESAI'
group by table_number
having count(*) > 1;
