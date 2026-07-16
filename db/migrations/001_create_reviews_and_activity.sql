-- Migration: create reviews and activity_logs tables
-- Run these statements in Supabase SQL editor or via migration tooling

-- Reviews table
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  review_text text not null,
  user_rating int,
  food_rating int,
  service_rating int,
  ambience_rating int,
  sentiment_prediction text,
  sentiment_confidence float,
  complaint_category text,
  complaint_confidence float,
  severity_prediction text,
  severity_confidence float,
  keywords jsonb,
  google_redirected boolean default false,
  route_decision text,
  decision_reason text,
  created_at timestamptz default now()
);

create index if not exists idx_reviews_restaurant_created_at on reviews (restaurant_id, created_at desc);
create index if not exists idx_reviews_sentiment on reviews (sentiment_prediction);

-- Activity logs
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text,
  activity_type text,
  customer_name text,
  rating int,
  review_text text,
  feedback_text text,
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_activity_restaurant on activity_logs (restaurant_id);
