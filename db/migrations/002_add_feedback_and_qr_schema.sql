-- Extension: Add feedback table to migration
-- Run this after the main 001 migration

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  customer_name text default 'Anonymous',
  customer_email text default 'anonymous@example.com',
  category text,
  severity text,
  feedback_text text not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_feedback_restaurant_created_at on feedback (restaurant_id, created_at desc);
create index if not exists idx_feedback_severity on feedback (severity);
create index if not exists idx_feedback_resolved on feedback (resolved);

-- Ensure qr_codes table exists with proper schema
create table if not exists qr_codes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  qr_token text unique not null,
  qr_image_url text,
  total_scans int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_qr_restaurant on qr_codes (restaurant_id);

-- Ensure restaurants table has necessary columns
alter table restaurants add column if not exists google_review_link text;

-- Enable RLS if needed (Supabase specific)
-- alter table reviews enable row level security;
-- alter table feedback enable row level security;
-- alter table activity_logs enable row level security;
