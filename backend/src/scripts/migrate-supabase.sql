-- Haru AI Teacher — Supabase schema (run once in the Supabase SQL editor).

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  display_name text,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  created_at timestamptz not null default now()
);

create table if not exists credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  delta integer not null,            -- +20 on signup grant, -1 per chat, +200 on upgrade
  reason text not null,              -- 'signup' | 'chat' | 'upgrade' | 'admin'
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_idx on credit_ledger(user_id, created_at desc);

create table if not exists user_mastery (
  user_id uuid not null references users(id) on delete cascade,
  concept text not null,
  count integer not null default 1,
  last_seen timestamptz not null default now(),
  primary key (user_id, concept)
);
