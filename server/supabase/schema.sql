-- NestOS Supabase schema
-- Run in Supabase SQL editor when STORE_MODE=supabase

create extension if not exists "pgcrypto";

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  role text,
  skills text[] default '{}',
  experience text,
  ctc text,
  notice text,
  location text,
  stage text default 'Sourced',
  source text default 'Bulk PDF',
  resume_path text,
  resume_original_name text,
  raw_text_preview text,
  parse_confidence float default 0,
  parse_method text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists candidates_email_idx on candidates (lower(email));
create index if not exists candidates_name_idx on candidates (lower(name));

create table if not exists outreach_log (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete set null,
  type text not null,
  target text not null,
  context text,
  outcome text,
  created_at timestamptz default now()
);

-- Storage bucket: create "resumes" in Supabase Storage (private)
