-- Run in Supabase > SQL Editor
create table if not exists health_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table health_data enable row level security;
drop policy if exists "read own" on health_data;
create policy "read own"   on health_data for select using (auth.uid() = user_id);
drop policy if exists "insert own" on health_data;
create policy "insert own" on health_data for insert with check (auth.uid() = user_id);
drop policy if exists "update own" on health_data;
create policy "update own" on health_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own" on health_data;
create policy "delete own" on health_data for delete using (auth.uid() = user_id);
-- FHIR R4 Bundle snapshot saved by the app next to the app data (a Bundle of Patient, Observation, MedicationRequest, Condition)
alter table health_data add column if not exists fhir_bundle jsonb check (fhir_bundle is null or fhir_bundle->>'resourceType' = 'Bundle');
-- Each user's row is limited to about 5 MB so one account cannot fill the database (safe to run again)
alter table health_data drop constraint if exists health_data_size;
alter table health_data add constraint health_data_size check (pg_column_size(data) < 5000000 and (fhir_bundle is null or pg_column_size(fhir_bundle) < 5000000));

-- ========================================================
-- RAG (Retrieval-Augmented Generation) with pgvector
-- ========================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create document_chunks table for semantic search
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  doc_id text not null,
  chunk_index int not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768), -- Google Gemini text-embedding-004 dimensions
  created_at timestamptz default now()
);

-- 3. Row Level Security: isolate each patient's document chunks
alter table document_chunks enable row level security;

drop policy if exists "read own chunks" on document_chunks;
create policy "read own chunks" on document_chunks for select using (auth.uid() = user_id);

drop policy if exists "insert own chunks" on document_chunks;
create policy "insert own chunks" on document_chunks for insert with check (auth.uid() = user_id);

drop policy if exists "update own chunks" on document_chunks;
create policy "update own chunks" on document_chunks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own chunks" on document_chunks;
create policy "delete own chunks" on document_chunks for delete using (auth.uid() = user_id);

-- 4. Create indexes for fast filtering and cosine similarity
create index if not exists document_chunks_user_id_idx on document_chunks (user_id);
create index if not exists document_chunks_embedding_idx on document_chunks using hnsw (embedding vector_cosine_ops);

-- 5. Semantic similarity match function for RAG retrieval
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float default 0.28,
  match_count int default 4,
  p_user_id uuid default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable security invoker as $$
  select
    dc.id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where (p_user_id is null or dc.user_id = p_user_id)
    and (1 - (dc.embedding <=> query_embedding)) > match_threshold
  order by similarity desc
  limit match_count;
$$;

-- ========================================================
-- HOSPITAL MULTI-TENANT & ROLE-BASED ACCESS CONTROL (RBAC)
-- ========================================================

-- 1. Hospitals / Health Organizations
create table if not exists hospitals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text unique not null,
  email text not null,
  phone text not null,
  address text,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz default now()
);

-- 2. User Profiles (Extending auth.users with Roles & Hospital Tenant ID)
create table if not exists user_profiles (
  id uuid primary key references auth.users on delete cascade,
  hospital_id uuid references hospitals(id) on delete set null,
  role text not null check (role in (
    'super_admin',
    'hospital_admin',
    'doctor',
    'lab_technician',
    'pharmacist',
    'receptionist',
    'patient'
  )),
  full_name text not null,
  phone text,
  specialization text,  -- for doctors (e.g. General Physician, Cardiologist)
  license_number text,  -- for doctors, pharmacists, lab technicians
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 3. Patient Hospital Encounters / Queue
create table if not exists patient_encounters (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  patient_id uuid references auth.users(id) on delete set null,
  patient_name text not null,
  patient_phone text,
  abha_number text,
  assigned_doctor_id uuid references user_profiles(id),
  status text not null default 'registered' check (status in (
    'registered',       -- checked in by receptionist
    'in_consult',       -- doctor consultation in progress
    'tests_pending',    -- lab tests ordered, waiting for lab technician
    'prescribed',       -- prescription issued, waiting for pharmacy
    'completed'         -- lab tests completed & medicine dispensed
  )),
  token_number int not null default 1,
  created_at timestamptz default now()
);

-- 4. Diagnostic Lab Orders & Results (Managed by Lab Technician)
create table if not exists hospital_lab_orders (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references patient_encounters(id) on delete cascade,
  hospital_id uuid not null references hospitals(id) on delete cascade,
  doctor_id uuid not null references user_profiles(id),
  test_name text not null,              -- e.g. HbA1c, Complete Blood Count, Lipid Profile
  test_code text,                       -- LOINC code (e.g. 4548-4)
  sample_type text,                     -- Blood, Urine, Serum, Plasma
  status text not null default 'ordered' check (status in (
    'ordered',                          -- requested by doctor
    'sample_collected',                 -- sample drawn by lab tech
    'processing',                       -- analyzer running
    'completed',                        -- values entered & verified
    'cancelled'
  )),
  results jsonb default '[]'::jsonb,    -- array of { test, value, unit, range_low, range_high, status }
  technician_id uuid references user_profiles(id),
  report_file_url text,                 -- PDF scan or report image if uploaded
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 5. Prescriptions & Dispensation (Written by Doctor, Dispensed by Pharmacist)
create table if not exists hospital_prescriptions (
  id uuid primary key default gen_random_uuid(),
  encounter_id uuid not null references patient_encounters(id) on delete cascade,
  hospital_id uuid not null references hospitals(id) on delete cascade,
  doctor_id uuid not null references user_profiles(id),
  medications jsonb not null default '[]'::jsonb, -- array of { name, dose, freq, days, instructions }
  clinical_notes text,
  dispense_status text not null default 'pending' check (dispense_status in ('pending', 'dispensed', 'partial')),
  pharmacist_id uuid references user_profiles(id),
  dispensed_at timestamptz,
  created_at timestamptz default now()
);

-- Row-Level Security for Hospital Multi-Tenancy
alter table hospitals enable row level security;
alter table user_profiles enable row level security;
alter table patient_encounters enable row level security;
alter table hospital_lab_orders enable row level security;
alter table hospital_prescriptions enable row level security;

-- Policies for hospitals
drop policy if exists "Public can view active hospitals" on hospitals;
create policy "Public can view active hospitals" on hospitals for select using (status = 'active');

drop policy if exists "Super admin can manage hospitals" on hospitals;
create policy "Super admin can manage hospitals" on hospitals for all using (
  (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Policies for user_profiles
drop policy if exists "Users view own profile or staff in same hospital" on user_profiles;
create policy "Users view own profile or staff in same hospital" on user_profiles for select using (
  auth.uid() = id
  or hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Policies for encounters
drop policy if exists "Staff access own hospital encounters" on patient_encounters;
create policy "Staff access own hospital encounters" on patient_encounters for all using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Policies for lab orders
drop policy if exists "Staff access own hospital lab orders" on hospital_lab_orders;
create policy "Staff access own hospital lab orders" on hospital_lab_orders for all using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Policies for prescriptions
drop policy if exists "Staff access own hospital prescriptions" on hospital_prescriptions;
create policy "Staff access own hospital prescriptions" on hospital_prescriptions for all using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);
