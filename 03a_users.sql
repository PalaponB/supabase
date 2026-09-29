insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$11111111-1111-4111-8111-111111111111$$::uuid, $$authenticated$$, $$authenticated$$, $$admin@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Natthawut Srisuwan"}$$::jsonb, now(), now() on conflict (id) do nothing;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$22222222-2222-4222-8222-222222222222$$::uuid, $$authenticated$$, $$authenticated$$, $$tech1@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Somchai Jaidee"}$$::jsonb, now(), now() on conflict (id) do nothing;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) select $$33333333-3333-4333-8333-333333333333$$::uuid, $$authenticated$$, $$authenticated$$, $$tech2@evchargeops.co.th$$, extensions.crypt($$Password123!$$, extensions.gen_salt($$bf$$)), now(), $${"provider":"email","providers":["email"]}$$::jsonb, $${"full_name":"Piyaporn Wongtong"}$$::jsonb, now(), now() on conflict (id) do nothing;

update public.profiles set role = $$Admin$$ where id = $$11111111-1111-4111-8111-111111111111$$::uuid;

update public.profiles set role = $$Technician$$ where id = $$22222222-2222-4222-8222-222222222222$$::uuid;

update public.profiles set role = $$Technician$$ where id = $$33333333-3333-4333-8333-333333333333$$::uuid;

select count(*) as seeded_users from public.profiles;
