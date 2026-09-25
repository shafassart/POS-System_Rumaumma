create or replace function public.require_takeaway_customer_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_type = 'TAKEAWAY'
     and nullif(pg_catalog.btrim(new.customer_name), '') is null then
    raise exception 'Nama tamu wajib diisi untuk takeaway'
      using errcode = '23514';
  end if;

  return new;
end
$$;

create trigger require_takeaway_customer_name
before insert or update of order_type, customer_name on public.orders
for each row execute function public.require_takeaway_customer_name();
