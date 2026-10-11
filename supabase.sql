-- Run in Supabase > SQL Editor
create table if not exists health_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table health_data enable row level security;
create policy "read own"   on health_data for select using (auth.uid() = user_id);
create policy "insert own" on health_data for insert with check (auth.uid() = user_id);
create policy "update own" on health_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own" on health_data for delete using (auth.uid() = user_id);
-- FHIR R4 Bundle snapshot saved by the app next to the app data (a Bundle of Patient, Observation, MedicationRequest, Condition)
alter table health_data add column if not exists fhir_bundle jsonb check (fhir_bundle is null or fhir_bundle->>'resourceType' = 'Bundle');
