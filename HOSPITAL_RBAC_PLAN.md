# Hospital Admin & Multi-Tenant RBAC Implementation Plan
## Medoryx Health Platform Expansion

---

## 1. Executive Summary & Architecture Overview

This document outlines the architecture and implementation plan to expand **Medoryx** from an individual patient health companion into a **multi-tenant hospital management platform**.

### Tenancy Hierarchy:
```
┌─────────────────────────────────────────────────────────────┐
│                 SUPER ADMIN (Platform Level)                │
│       • Approves/Suspends Hospital Registrations            │
│       • Global Analytics, Compliance & Audit Logs           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
   ┌─────────────────────────┐   ┌─────────────────────────┐
   │  HOSPITAL A (Tenant)    │   │  HOSPITAL B (Tenant)    │
   │  e.g., City Care Clinic │   │  e.g., Metro Hospital   │
   └────────────┬────────────┘   └────────────┬────────────┘
                │                             │
    ┌───────────┴─────────────────────────────┴───────────┐
    ▼                                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 HOSPITAL ADMIN (Tenant Admin)               │
│  • Manages hospital profile & departments                   │
│  • Creates & provisions staff employee logins               │
└──────────────────────────────┬──────────────────────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│    DOCTOR    │        │LAB TECHNICIAN│        │ RECEPTIONIST │
│ • Queue      │        │ • Lab Orders │        │ • Check-in   │
│ • History/AI │        │ • Run Tests  │        │ • ABHA reg   │
│ • Rx & Labs  │        │ • LOINC/Norm │        │ • Appts      │
└──────┬───────┘        └──────┬───────┘        └──────────────┘
       │                       │
       ▼                       ▼
┌──────────────┐        ┌──────────────┐
│  PHARMACIST  │        │   PATIENTS   │
│ • Dispense   │        │ • Timeline   │
│ • Stock/Rx   │        │ • AI Copilot │
└──────────────┘        └──────────────┘
```

---

## 2. Database Schema (Supabase PostgreSQL)

Add the following tables to your Supabase database:

```sql
-- 1. Hospitals / Clinics (Tenant Organization)
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
  specialization text,  -- for doctors (e.g. Cardiologist, General Physician)
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

-- ========================================================
-- Row Level Security (RLS) for Multi-Tenant Isolation
-- ========================================================
alter table hospitals enable row level security;
alter table user_profiles enable row level security;
alter table patient_encounters enable row level security;
alter table hospital_lab_orders enable row level security;
alter table hospital_prescriptions enable row level security;

-- Hospital staff only view their hospital's profiles
create policy "Staff access own hospital profiles"
on user_profiles for select
using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Hospital staff only view encounters of their hospital
create policy "Staff access own hospital encounters"
on patient_encounters for all
using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Lab Tech and Doctor access hospital lab orders
create policy "Staff access own hospital lab orders"
on hospital_lab_orders for all
using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);

-- Pharmacist and Doctor access hospital prescriptions
create policy "Staff access own hospital prescriptions"
on hospital_prescriptions for all
using (
  hospital_id = (select hospital_id from user_profiles where id = auth.uid())
  or (select role from user_profiles where id = auth.uid()) = 'super_admin'
);
```

---

## 3. How Hospital Admin Creates Staff Accounts Without Logging Out

In standard Supabase client libraries, calling `supabase.auth.signUp()` logs the current user out.

To solve this, we implement a secure serverless endpoint:
**`POST /api/hospital/create-staff`**

### Execution Flow:
1. Hospital Admin logs in with `hospital_admin` role.
2. The Admin navigates to **Staff Management** and fills:
   - Full Name
   - Email
   - Role: `doctor`, `lab_technician`, `pharmacist`, or `receptionist`
   - Specialization / License Number (if applicable)
   - Temporary Password
3. Request is sent with the Admin's JWT token to `/api/hospital/create-staff`.
4. The server validates that the caller has `role === 'hospital_admin'`.
5. The server uses Supabase Admin API (`SUPABASE_SERVICE_ROLE_KEY`):
   ```javascript
   // 1. Create user in auth.users
   const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
     email,
     password,
     email_confirm: true,
     user_metadata: { role, hospital_id: adminProfile.hospital_id }
   });

   // 2. Insert into user_profiles
   await supabaseAdmin.from('user_profiles').insert({
     id: newUser.user.id,
     hospital_id: adminProfile.hospital_id,
     role: role,
     full_name: fullName,
     specialization: specialization || null,
     license_number: licenseNumber || null
   });
   ```
6. The new staff member can immediately log in with their credentials.

---

## 4. Role-Specific Portals & User Workflows

### Portal 1: Super Admin (Platform Owner)
* **URL / View**: `V = 'super_admin'`
* **Features**:
  - List of all registered hospitals with filter: `Pending`, `Active`, `Suspended`.
  - Approve or Reject new hospital registration requests.
  - View platform-wide metrics (total hospitals, active doctors, daily patient count).
  - System audit log.

### Portal 2: Hospital Admin (Tenant Manager)
* **URL / View**: `V = 'hospital_admin'`
* **Features**:
  - Hospital profile configuration (Name, Address, Helpline, Departments).
  - **Staff Management Directory**:
    - Add New Staff member modal:
      * **Doctor**
      * **Lab Technician**
      * **Pharmacist**
      * **Receptionist**
    - View active staff categorized by role.
    - Activate / Deactivate staff credentials.
  - Daily OPD (Outpatient Department) load analytics.

### Portal 3: Receptionist Portal (Front Desk)
* **URL / View**: `V = 'receptionist'`
* **Features**:
  - **Quick Patient Registration**: Name, Age, Gender, Phone, 14-digit ABHA ID.
  - **Doctor Selection**: Assign patient to available doctor.
  - Generates token number and adds to live patient queue.
  - View live status of patient visits (Checked-in $\rightarrow$ In Consultation $\rightarrow$ Lab Tests $\rightarrow$ Pharmacy $\rightarrow$ Completed).

### Portal 4: Doctor Portal (Consultation & Clinical EHR)
* **URL / View**: `V = 'doctor'`
* **Features**:
  - Live consultation queue of registered patients.
  - **Integrated Medoryx AI RAG Search**:
    - Instant semantic search across past patient records (e.g. *"Show HbA1c progression over the last 12 months"* or *"Check past allergies"*).
  - **Lab Test Ordering**:
    - Select standard diagnostic tests (CBC, HbA1c, Fasting Blood Sugar, Lipid Profile, Thyroid, Vitamin D).
    - Test order routes immediately to the **Lab Technician Portal**.
  - **E-Prescription Builder**:
    - Add medicines (Name, Dose, Frequency 1-0-1, Days).
    - Prescription routes immediately to the **Pharmacy Portal**.
  - Clicking **"Finish Consultation"** updates the visit status.

### Portal 5: Lab Technician Portal (Pathology & Diagnostics)
* **URL / View**: `V = 'lab_tech'`
* **Features**:
  - **Incoming Lab Orders Queue**: Real-time list of test requests sent by doctors.
  - **Sample Tracking**: Mark status as *Sample Collected* $\rightarrow$ *Processing*.
  - **Result Entry & Verification**:
    - Enter numeric values, units, and reference ranges.
    - System automatically flags **Low / High / Critical** using Medoryx's plausibility engine.
    - Automatically maps to **LOINC codes** (e.g. `4548-4` for HbA1c) and **UCUM units**.
  - **PDF / Scan Upload**: Upload report scan with automated OCR extraction via `api/extract.js`.
  - Clicking **"Complete Test"** pushes verified results directly to the patient's timeline and the consulting doctor's dashboard.

### Portal 6: Pharmacist Portal (Medication Dispensing & Stock)
* **URL / View**: `V = 'pharmacy'`
* **Features**:
  - **Live Prescription Queue**: Incoming prescriptions from hospital doctors.
  - **Prescription Verification**:
    - Review prescribed medicine names, dosage strengths, and durations.
    - Check drug schedule (`1-0-1`, `OD`, `BD`, `weekly`).
  - **Dispense Actions**:
    - Mark as **"Dispensed"** or **"Partially Dispensed"** with pharmacist digital signature.
  - **Patient Instruction Print**: Generates printed dosage instruction labels in English, Hindi, or Telugu.

---

## 5. Implementation Roadmap (Phases)

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1** | **Database & RLS** | Run SQL schema in Supabase for `hospitals`, `user_profiles`, `patient_encounters`, `hospital_lab_orders`, and `hospital_prescriptions`. |
| **Phase 2** | **Backend Microservices** | Create `/api/hospital/register`, `/api/admin/hospitals`, and `/api/hospital/create-staff`. |
| **Phase 3** | **Auth & Role Routing** | Update login flow to inspect `user_profiles.role` and direct users to their specific dashboard (`doctor`, `lab_technician`, `pharmacist`, `receptionist`, `hospital_admin`, `super_admin`). |
| **Phase 4** | **Hospital Admin & Receptionist** | Build UI for Hospital Admin staff creation & Receptionist patient registration queue. |
| **Phase 5** | **Doctor $\leftrightarrow$ Lab Technician Workflow** | Connect Doctor lab orders $\rightarrow$ Lab Technician test result entry (LOINC & FHIR observations) $\rightarrow$ Doctor review. |
| **Phase 6** | **Doctor $\leftrightarrow$ Pharmacist Workflow** | Connect Doctor e-prescriptions $\rightarrow$ Pharmacist dispensation queue & label print. |

---
*Created for Medoryx Health Platform.*
