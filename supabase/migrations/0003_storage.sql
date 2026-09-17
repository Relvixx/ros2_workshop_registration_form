-- Storage: private `payment-proofs` bucket.
-- Run `supabase storage` / dashboard note: this SQL creates the bucket row;
-- RLS policies on storage.objects deny all direct anon access. All uploads
-- and signed-URL issuance happen server-side with the service-role key.
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
