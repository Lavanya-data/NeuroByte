// Multi-tenant Hospital Management & RBAC Backend Microservice for Medoryx
// Roles supported:
// 1. Super Admin: Approve/suspend hospitals, system-wide analytics, view all user information
// 2. Hospital Admin: Hospital profile, provision employee staff accounts (Doctor, Lab Tech, Pharmacist, Receptionist)
// 3. Receptionist: Patient check-in, ABHA linking, token generation, OPD queue
// 4. Doctor: Consultation queue, Medoryx AI RAG clinical history, lab test ordering, e-prescriptions
// 5. Lab Technician: Diagnostic queue, enter test results with LOINC codes, reference ranges, High/Low flagging
// 6. Pharmacist: Dispensation queue, dosage verification, multilingual label printing

const { guard } = require('./_guard.js');
const { clean } = require('./_gemini.js');

// Helper to convert raw SVG XML into a robust Base64 data URI (avoids URL '#' hash fragment truncation in browsers)
function makeDocSvg(svg) {
  return 'data:image/svg+xml;base64,' + Buffer.from(svg.trim()).toString('base64');
}

// Resilient memory store initialized with realistic clinical demo data
const memoryStore = global.__medoryx_hosp_store || (global.__medoryx_hosp_store = {
  hospitals: [
    {
      id: 'hosp-001',
      name: 'City Care Multi-Speciality Hospital',
      registrationNumber: 'REG-2026-HYD-8491',
      email: 'admin@citycare.example.com',
      phone: '+91 40 2345 6789',
      address: 'Road No. 12, Banjara Hills, Hyderabad, Telangana',
      departments: 'General Medicine, Cardiology, Pathology, Pharmacy',
      status: 'active',
      createdAt: '2026-03-01T09:00:00Z'
    },
    {
      id: 'hosp-002',
      name: 'Apollo Lifeline Clinic',
      registrationNumber: 'REG-2026-BLR-1204',
      email: 'contact@apollo-lifeline.example.com',
      phone: '+91 80 4123 9900',
      address: 'Koramangala 4th Block, Bengaluru, Karnataka',
      departments: 'Internal Medicine, Diagnostics',
      status: 'pending',
      createdAt: '2026-04-10T14:30:00Z'
    }
  ],
  userProfiles: [
    {
      id: 'usr-super',
      hospitalId: null,
      role: 'super_admin',
      fullName: 'Dr. Vikramaditya Rao',
      email: 'superadmin@medoryx.example.com',
      phone: '+91 98000 00001',
      specialization: 'Platform Administrator',
      licenseNumber: 'MCI-SUPER-01',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr-hosp-admin',
      hospitalId: 'hosp-001',
      role: 'hospital_admin',
      fullName: 'Sunita Mehra (Admin)',
      email: 'admin@citycare.example.com',
      phone: '+91 98000 00002',
      specialization: 'Hospital Administration & Operations',
      licenseNumber: 'HA-2026-091',
      isActive: true,
      createdAt: '2026-03-01T09:15:00Z'
    },
    {
      id: 'usr-doc-1',
      hospitalId: 'hosp-001',
      role: 'doctor',
      fullName: 'Dr. Rajesh Sharma, MD',
      email: 'dr.sharma@citycare.example.com',
      phone: '+91 98490 12345',
      specialization: 'Consultant Physician & Diabetologist',
      licenseNumber: 'TSMC-64821',
      isActive: true,
      createdAt: '2026-03-02T10:00:00Z'
    },
    {
      id: 'usr-lab-1',
      hospitalId: 'hosp-001',
      role: 'lab_technician',
      fullName: 'Ananya Patel, BMLT',
      email: 'ananya.lab@citycare.example.com',
      phone: '+91 98490 54321',
      specialization: 'Senior Clinical Pathologist',
      licenseNumber: 'PMLT-98124',
      isActive: true,
      createdAt: '2026-03-02T11:00:00Z'
    },
    {
      id: 'usr-pharma-1',
      hospitalId: 'hosp-001',
      role: 'pharmacist',
      fullName: 'Vikram Verma, B.Pharm',
      email: 'vikram.rx@citycare.example.com',
      phone: '+91 98490 67890',
      specialization: 'Registered Pharmacist',
      licenseNumber: 'PCI-TS-44120',
      isActive: true,
      createdAt: '2026-03-02T11:30:00Z'
    },
    {
      id: 'usr-recep-1',
      hospitalId: 'hosp-001',
      role: 'receptionist',
      fullName: 'Priya Nair',
      email: 'priya.frontdesk@citycare.example.com',
      phone: '+91 98490 11223',
      specialization: 'Front Desk & Patient Triage',
      licenseNumber: 'FD-104',
      isActive: true,
      createdAt: '2026-03-02T12:00:00Z'
    },
    {
      id: 'usr-patient-1',
      hospitalId: 'hosp-001',
      role: 'patient',
      fullName: 'Ramesh Chandra',
      email: 'ramesh.c@example.com',
      phone: '+91 98765 43210',
      specialization: 'Patient',
      licenseNumber: null,
      isActive: true,
      createdAt: '2026-03-10T08:00:00Z'
    }
  ],
  encounters: [
    {
      id: 'enc-101',
      hospitalId: 'hosp-001',
      patientName: 'Ramesh Chandra',
      patientPhone: '+91 98765 43210',
      patientAge: '54',
      patientGender: 'male',
      abhaNumber: '91-4829-1029-4819',
      assignedDoctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      chiefComplaint: 'Postprandial dizziness, routine HbA1c review & fatigue',
      tokenNumber: 101,
      status: 'in_consult', // registered, in_consult, tests_pending, prescribed, completed
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'enc-102',
      hospitalId: 'hosp-001',
      patientName: 'Meera Deshmukh',
      patientPhone: '+91 98112 33445',
      patientAge: '42',
      patientGender: 'female',
      abhaNumber: '91-1209-3381-9920',
      assignedDoctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      chiefComplaint: 'Mild palpitations, routine thyroid & lipid screening',
      tokenNumber: 102,
      status: 'tests_pending',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'enc-103',
      hospitalId: 'hosp-001',
      patientName: 'Kavita Reddy',
      patientPhone: '+91 97001 22334',
      patientAge: '36',
      patientGender: 'female',
      abhaNumber: '91-6677-8899-0011',
      assignedDoctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      chiefComplaint: 'Follow-up for iron deficiency anemia and vitamin D refill',
      tokenNumber: 103,
      status: 'prescribed',
      createdAt: new Date(Date.now() - 10800000).toISOString()
    },
    {
      id: 'enc-104',
      hospitalId: 'hosp-001',
      patientName: 'Anitha',
      patientPhone: '+91 98765 43210',
      patientAge: '52',
      patientGender: 'female',
      abhaNumber: '91-1234-5678-9012',
      assignedDoctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      chiefComplaint: 'Type 2 diabetes mellitus, hypertension, dyslipidemia & iron deficiency anemia review',
      tokenNumber: 104,
      status: 'in_consult',
      createdAt: new Date(Date.now() - 1800000).toISOString()
    }
  ],
  labOrders: [
    {
      id: 'lab-ord-anitha-1',
      encounterId: 'enc-104',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Anitha',
      testName: 'Comprehensive Diagnostic Panel (9 Lab Values)',
      testCode: '4548-4 / 1558-6 / 2089-1',
      sampleType: 'Whole Blood EDTA & Venous Serum',
      status: 'completed',
      results: [
        { test: 'HbA1c Glycated Hemoglobin', value: 6.2, unit: '%', rangeLow: 4.0, rangeHigh: 5.6, status: 'High', loinc: '4548-4' },
        { test: 'Fasting Blood Glucose', value: 108, unit: 'mg/dL', rangeLow: 70, rangeHigh: 99, status: 'High', loinc: '1558-6' },
        { test: 'LDL Cholesterol', value: 128, unit: 'mg/dL', rangeLow: 0, rangeHigh: 100, status: 'High', loinc: '2089-1' },
        { test: 'Hemoglobin', value: 11.8, unit: 'g/dL', rangeLow: 12.0, rangeHigh: 15.5, status: 'Low', loinc: '718-7' },
        { test: 'Vitamin D 25-Hydroxy', value: 27, unit: 'ng/mL', rangeLow: 30, rangeHigh: 100, status: 'Low', loinc: '62292-8' },
        { test: 'Total Cholesterol', value: 195, unit: 'mg/dL', rangeLow: 125, rangeHigh: 200, status: 'Normal', loinc: '2093-3' },
        { test: 'Serum Triglycerides', value: 142, unit: 'mg/dL', rangeLow: 0, rangeHigh: 150, status: 'Normal', loinc: '2571-8' },
        { test: 'HDL Good Cholesterol', value: 48, unit: 'mg/dL', rangeLow: 40, rangeHigh: 60, status: 'Normal', loinc: '2085-9' },
        { test: 'Serum Creatinine', value: 0.9, unit: 'mg/dL', rangeLow: 0.6, rangeHigh: 1.2, status: 'Normal', loinc: '2160-0' }
      ],
      technicianId: 'usr-lab-1',
      completedAt: '2026-09-15T10:30:00Z',
      createdAt: '2026-09-15T09:00:00Z'
    },
    {
      id: 'lab-ord-anitha-2',
      encounterId: 'enc-104',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Anitha',
      testName: 'Routine Diabetic & Lipid Panel (9 Lab Values)',
      testCode: '4548-4 / 718-7',
      sampleType: 'Venous Blood',
      status: 'completed',
      results: [
        { test: 'HbA1c Glycated Hemoglobin', value: 6.5, unit: '%', rangeLow: 4.0, rangeHigh: 5.6, status: 'High', loinc: '4548-4' },
        { test: 'Fasting Blood Glucose', value: 116, unit: 'mg/dL', rangeLow: 70, rangeHigh: 99, status: 'High', loinc: '1558-6' },
        { test: 'LDL Cholesterol', value: 132, unit: 'mg/dL', rangeLow: 0, rangeHigh: 100, status: 'High', loinc: '2089-1' },
        { test: 'Hemoglobin', value: 11.4, unit: 'g/dL', rangeLow: 12.0, rangeHigh: 15.5, status: 'Low', loinc: '718-7' },
        { test: 'Vitamin D 25-Hydroxy', value: 22, unit: 'ng/mL', rangeLow: 30, rangeHigh: 100, status: 'Low', loinc: '62292-8' }
      ],
      technicianId: 'usr-lab-1',
      completedAt: '2026-06-20T11:00:00Z',
      createdAt: '2026-06-20T08:30:00Z'
    },
    {
      id: 'lab-ord-1',
      encounterId: 'enc-102',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Meera Deshmukh',
      testName: 'Lipid Profile & Thyroid (TSH)',
      testCode: '2093-3 / 3016-3',
      sampleType: 'Serum / Venous Blood',
      status: 'ordered', // ordered, sample_collected, processing, completed
      results: [],
      technicianId: null,
      createdAt: new Date(Date.now() - 6500000).toISOString()
    },
    {
      id: 'lab-ord-2',
      encounterId: 'enc-101',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Ramesh Chandra',
      testName: 'Glycated Hemoglobin (HbA1c) & Fasting Glucose',
      testCode: '4548-4 / 1558-6',
      sampleType: 'Whole Blood EDTA',
      status: 'completed',
      results: [
        { test: 'HbA1c', value: 6.8, unit: '%', rangeLow: 4.0, rangeHigh: 5.6, status: 'High', loinc: '4548-4' },
        { test: 'Fasting Blood Sugar', value: 124, unit: 'mg/dL', rangeLow: 70, rangeHigh: 99, status: 'High', loinc: '1558-6' }
      ],
      technicianId: 'usr-lab-1',
      completedAt: new Date(Date.now() - 2400000).toISOString(),
      createdAt: new Date(Date.now() - 5000000).toISOString()
    }
  ],
  prescriptions: [
    {
      id: 'rx-ord-anitha-1',
      encounterId: 'enc-104',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Anitha',
      medications: [
        { name: 'Tab Metformin Hydrochloride', dose: '500mg', freq: '1-0-0', days: 30, instructions: 'Take with morning breakfast.' },
        { name: 'Tab Ferrous Ascorbate', dose: '100mg', freq: '0-1-0', days: 60, instructions: 'Take with lunch. Avoid dairy within 2 hours.' },
        { name: 'Tab Atorvastatin', dose: '10mg', freq: '0-0-1', days: 30, instructions: 'Take at bedtime.' },
        { name: 'Cap Cholecalciferol (Vitamin D3)', dose: '60000IU', freq: 'weekly', days: 56, instructions: 'Take once weekly after breakfast for 8 weeks.' }
      ],
      clinicalNotes: 'Type 2 diabetes mellitus, Hypertension, Dyslipidemia, Iron deficiency anemia. Emphasize diet and walking.',
      dispenseStatus: 'dispensed',
      pharmacistId: 'usr-pharma-1',
      dispensedAt: '2026-06-22T10:15:00Z',
      createdAt: '2026-06-22T09:45:00Z'
    },
    {
      id: 'rx-ord-1',
      encounterId: 'enc-103',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Kavita Reddy',
      medications: [
        { name: 'Tab Ferrous Ascorbate', dose: '100mg', freq: '0-1-0', days: 60, instructions: 'Take after lunch with water. Avoid milk or antacids within 2 hours.' },
        { name: 'Cap Cholecalciferol (Vitamin D3)', dose: '60000IU', freq: 'weekly', days: 56, instructions: 'Take once every Sunday after a fatty meal.' }
      ],
      clinicalNotes: 'Mild microcytic hypochromic anemia improving. Continue oral hematinic for 60 days.',
      dispenseStatus: 'pending', // pending, dispensed, partial
      pharmacistId: null,
      dispensedAt: null,
      createdAt: new Date(Date.now() - 9000000).toISOString()
    },
    {
      id: 'rx-ord-2',
      encounterId: 'enc-101',
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      patientName: 'Ramesh Chandra',
      medications: [
        { name: 'Tab Metformin Hydrochloride', dose: '500mg', freq: '1-0-1', days: 30, instructions: 'Take with or immediately after meals to minimize GI distress.' },
        { name: 'Tab Atorvastatin', dose: '10mg', freq: '0-0-1', days: 30, instructions: 'Take at bedtime.' }
      ],
      clinicalNotes: 'Prediabetes and mild dyslipidemia. Emphasize low glycemic diet and 30 min daily brisk walking.',
      dispenseStatus: 'dispensed',
      pharmacistId: 'usr-pharma-1',
      dispensedAt: new Date(Date.now() - 1200000).toISOString(),
      createdAt: new Date(Date.now() - 3000000).toISOString()
    }
  ],
  appointments: [
    {
      id: 'apt-103',
      hospitalId: 'hosp-001',
      hospitalName: 'City Care Multi-Speciality Hospital',
      doctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      patientName: 'Anitha',
      patientEmail: 'anitha@example.com',
      patientPhone: '+91 98765 43210',
      patientAge: '52',
      patientGender: 'female',
      date: '2026-10-27',
      timeSlot: '09:45 AM',
      reason: 'Routine quarterly diabetes and lipid profile consultation',
      status: 'accepted',
      doctorNotes: 'Confirmed by Dr. Rajesh Sharma. Bring recent blood glucose logs.',
      notes: 'Scheduled OPD appointment.',
      createdAt: new Date(Date.now() - 43200000).toISOString()
    },
    {
      id: 'apt-101',
      hospitalId: 'hosp-001',
      hospitalName: 'City Care Multi-Speciality Hospital',
      doctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      patientName: 'Demo Evaluator',
      patientEmail: 'evaluator@medoryx.example.com',
      patientPhone: '+91 98765 43210',
      patientAge: '45',
      patientGender: 'male',
      date: '2026-10-25',
      timeSlot: '10:30 AM',
      reason: 'Follow-up consultation for elevated HbA1c (6.8%) and diet plan',
      status: 'pending', // pending, accepted, declined, completed
      doctorNotes: '',
      notes: 'Patient requested morning slot for fasting blood sugar review.',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'apt-102',
      hospitalId: 'hosp-001',
      hospitalName: 'City Care Multi-Speciality Hospital',
      doctorId: 'usr-doc-1',
      doctorName: 'Dr. Rajesh Sharma, MD',
      patientName: 'Ramesh Chandra',
      patientEmail: 'ramesh.c@example.com',
      patientPhone: '+91 98765 43210',
      patientAge: '54',
      patientGender: 'male',
      date: '2026-10-26',
      timeSlot: '11:15 AM',
      reason: 'Postprandial dizziness and medication review',
      status: 'accepted',
      doctorNotes: 'Confirmed by Dr. Sharma. Consultation in OPD Room 101. Bring previous reports.',
      notes: 'Scheduled consultation.',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  abhaPatients: [
    {
      id: 'abha-anitha',
      abhaNumber: '91-1234-5678-9012',
      abhaAddress: 'anitha@abdm',
      name: 'Anitha',
      age: '52',
      dob: '1991-01-01',
      gender: 'female',
      phone: '+91 98765 43210',
      email: 'anitha@example.com',
      bloodGroup: 'B+',
      status: 'VERIFIED_ABDM',
      createdAt: '2026-01-15T09:00:00Z',
      records: [
        {
          type: 'Lab report',
          date: '2026-09-15',
          dx: 'Type 2 Diabetes Mellitus & Dyslipidemia follow-up review',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [
            { n: 'HbA1c', v: 6.2, u: '%', lo: 4.0, hi: 5.6 },
            { n: 'Fasting Glucose', v: 108, u: 'mg/dL', lo: 70, hi: 99 },
            { n: 'LDL Cholesterol', v: 128, u: 'mg/dL', lo: 0, hi: 100 },
            { n: 'Hemoglobin', v: 11.8, u: 'g/dL', lo: 12.0, hi: 15.5 },
            { n: 'Vitamin D', v: 27, u: 'ng/mL', lo: 30, hi: 100 },
            { n: 'Total Cholesterol', v: 195, u: 'mg/dL', lo: 125, hi: 200 },
            { n: 'Triglycerides', v: 142, u: 'mg/dL', lo: 0, hi: 150 },
            { n: 'HDL Cholesterol', v: 48, u: 'mg/dL', lo: 40, hi: 60 },
            { n: 'Serum Creatinine', v: 0.9, u: 'mg/dL', lo: 0.6, hi: 1.2 }
          ],
          meds: [],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#064E3B"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#A7F3D0">CENTRAL CLINICAL PATHOLOGY &middot; NABL ACCREDITED &middot; HYDERABAD</text><text x="25" y="115" font-size="13" font-weight="bold" fill="#0F172A">PATIENT: ANITHA (FEMALE / 52Y)</text><text x="25" y="135" font-size="12" fill="#64748B">ABHA ID: 91-1234-5678-9012 &middot; PH: +91 98765 43210</text><text x="390" y="115" font-size="12" fill="#64748B">DATE: 15 SEP 2026</text><text x="390" y="135" font-size="12" fill="#64748B">REF: DR. RAJESH SHARMA, MD</text><line x1="25" y1="150" x2="575" y2="150" stroke="#CBD5E1" stroke-width="2"/><text x="25" y="180" font-size="12" font-weight="bold" fill="#064E3B">TEST PARAMETER</text><text x="230" y="180" font-size="12" font-weight="bold" fill="#064E3B">RESULT</text><text x="350" y="180" font-size="12" font-weight="bold" fill="#064E3B">REFERENCE</text><text x="490" y="180" font-size="12" font-weight="bold" fill="#064E3B">STATUS</text><line x1="25" y1="190" x2="575" y2="190" stroke="#064E3B" stroke-width="1.5"/><text x="25" y="220" font-size="12">HbA1c Glycated Hemoglobin</text><text x="230" y="220" font-size="12" font-weight="bold">6.2 %</text><text x="350" y="220" font-size="12">4.0 - 5.6 %</text><text x="490" y="220" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="250" font-size="12">Fasting Blood Glucose</text><text x="230" y="250" font-size="12" font-weight="bold">108 mg/dL</text><text x="350" y="250" font-size="12">70 - 99</text><text x="490" y="250" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="280" font-size="12">LDL Bad Cholesterol</text><text x="230" y="280" font-size="12" font-weight="bold">128 mg/dL</text><text x="350" y="280" font-size="12">0 - 100</text><text x="490" y="280" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="310" font-size="12">Hemoglobin</text><text x="230" y="310" font-size="12" font-weight="bold">11.8 g/dL</text><text x="350" y="310" font-size="12">12.0 - 15.5</text><text x="490" y="310" font-size="12" font-weight="bold" fill="#2563EB">LOW</text><text x="25" y="340" font-size="12">Vitamin D 25-Hydroxy</text><text x="230" y="340" font-size="12" font-weight="bold">27 ng/mL</text><text x="350" y="340" font-size="12">30 - 100</text><text x="490" y="340" font-size="12" font-weight="bold" fill="#2563EB">LOW</text><text x="25" y="370" font-size="12">Total Cholesterol</text><text x="230" y="370" font-size="12">195 mg/dL</text><text x="350" y="370" font-size="12">125 - 200</text><text x="490" y="370" font-size="12" fill="#16A34A">NORMAL</text><text x="25" y="400" font-size="12">Serum Triglycerides</text><text x="230" y="400" font-size="12">142 mg/dL</text><text x="350" y="400" font-size="12">0 - 150</text><text x="490" y="400" font-size="12" fill="#16A34A">NORMAL</text><text x="25" y="430" font-size="12">HDL Good Cholesterol</text><text x="230" y="430" font-size="12">48 mg/dL</text><text x="350" y="430" font-size="12">40 - 60</text><text x="490" y="430" font-size="12" fill="#16A34A">NORMAL</text><text x="25" y="460" font-size="12">Serum Creatinine</text><text x="230" y="460" font-size="12">0.9 mg/dL</text><text x="350" y="460" font-size="12">0.6 - 1.2</text><text x="490" y="460" font-size="12" fill="#16A34A">NORMAL</text><line x1="25" y1="580" x2="575" y2="580" stroke="#CBD5E1" stroke-width="1"/><text x="25" y="630" font-size="12" fill="#64748B">REPORT SIGNED BY: ANANYA PATEL, BMLT (SENIOR CLINICAL PATHOLOGIST)</text><text x="25" y="650" font-size="11" fill="#94A3B8">OFFICIAL DIGITAL REPORT VERIFIED ON ABDM EXCHANGE &middot; TIMESTAMP: 2026-09-15 10:30 IST</text></svg>')
        },
        {
          type: 'Prescription',
          date: '2026-06-22',
          dx: 'Type 2 diabetes mellitus, Hypertension, Dyslipidemia, Iron deficiency anemia',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [],
          meds: [
            { n: 'Tab Metformin Hydrochloride', dose: '500mg', freq: '1-0-0', days: 30 },
            { n: 'Tab Ferrous Ascorbate', dose: '100mg', freq: '0-1-0', days: 60 },
            { n: 'Tab Atorvastatin', dose: '10mg', freq: '0-0-1', days: 30 },
            { n: 'Cap Cholecalciferol (Vitamin D3)', dose: '60000IU', freq: 'weekly', days: 56 }
          ],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#0F766E"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#CCFBF1">DEPARTMENT OF GENERAL MEDICINE &middot; OPD CONSULTATION</text><text x="25" y="115" font-size="13" font-weight="bold" fill="#0F172A">PATIENT: ANITHA &middot; 52Y / FEMALE</text><text x="25" y="135" font-size="12" fill="#64748B">ABHA ID: 91-1234-5678-9012 &middot; TOKEN #104</text><text x="390" y="115" font-size="12" fill="#64748B">DATE: 22 JUN 2026</text><text x="390" y="135" font-size="12" fill="#64748B">CONSULTANT: DR. RAJESH SHARMA, MD</text><line x1="25" y1="150" x2="575" y2="150" stroke="#CBD5E1" stroke-width="2"/><text x="25" y="180" font-size="13" font-weight="bold" fill="#0F766E">DIAGNOSIS: Type 2 Diabetes, Hypertension, Dyslipidemia, Mild Anemia</text><text x="25" y="220" font-size="14" font-weight="bold" fill="#0F172A">Rx (PRESCRIPTION):</text><rect x="25" y="240" width="550" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/><text x="35" y="260" font-size="13" font-weight="bold">1. Tab Metformin 500mg</text><text x="35" y="278" font-size="11" fill="#64748B">Dose: 1-0-0 &middot; 30 Days &middot; Take with breakfast</text><rect x="25" y="295" width="550" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/><text x="35" y="315" font-size="13" font-weight="bold">2. Tab Ferrous Ascorbate 100mg</text><text x="35" y="333" font-size="11" fill="#64748B">Dose: 0-1-0 &middot; 60 Days &middot; Take after lunch with water</text><rect x="25" y="350" width="550" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/><text x="35" y="370" font-size="13" font-weight="bold">3. Tab Atorvastatin 10mg</text><text x="35" y="388" font-size="11" fill="#64748B">Dose: 0-0-1 &middot; 30 Days &middot; Take after dinner at bedtime</text><rect x="25" y="405" width="550" height="48" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/><text x="35" y="425" font-size="13" font-weight="bold">4. Cap Cholecalciferol (Vit D3) 60,000 IU</text><text x="35" y="443" font-size="11" fill="#64748B">Dose: Once weekly on Sundays for 8 weeks</text><text x="25" y="490" font-size="12" font-style="italic" fill="#334155">Advice: Low glycemic index diet, brisk walking 30 min daily. Repeat HbA1c in 3 months.</text><line x1="25" y1="580" x2="575" y2="580" stroke="#CBD5E1" stroke-width="1"/><text x="400" y="630" font-size="13" font-weight="bold" fill="#0F766E">Dr. Rajesh Sharma, MD</text><text x="400" y="648" font-size="11" fill="#64748B">Reg: TSMC-64821 (Signed Digitally)</text></svg>')
        },
        {
          type: 'Lab report',
          date: '2026-06-20',
          dx: 'Comprehensive Diabetic & Lipid Follow-up',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [
            { n: 'HbA1c', v: 6.5, u: '%', lo: 4.0, hi: 5.6 },
            { n: 'Fasting Glucose', v: 116, u: 'mg/dL', lo: 70, hi: 99 },
            { n: 'LDL Cholesterol', v: 132, u: 'mg/dL', lo: 0, hi: 100 },
            { n: 'Hemoglobin', v: 11.4, u: 'g/dL', lo: 12.0, hi: 15.5 },
            { n: 'Vitamin D', v: 22, u: 'ng/mL', lo: 30, hi: 100 },
            { n: 'Total Cholesterol', v: 202, u: 'mg/dL', lo: 125, hi: 200 },
            { n: 'Triglycerides', v: 154, u: 'mg/dL', lo: 0, hi: 150 },
            { n: 'HDL Cholesterol', v: 46, u: 'mg/dL', lo: 40, hi: 60 },
            { n: 'Serum Creatinine', v: 0.9, u: 'mg/dL', lo: 0.6, hi: 1.2 }
          ],
          meds: [],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#064E3B"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#A7F3D0">CENTRAL CLINICAL PATHOLOGY &middot; NABL ACCREDITED</text><text x="25" y="115" font-size="13" font-weight="bold" fill="#0F172A">PATIENT: ANITHA (FEMALE / 52Y)</text><text x="390" y="115" font-size="12" fill="#64748B">DATE: 20 JUN 2026</text><line x1="25" y1="150" x2="575" y2="150" stroke="#CBD5E1" stroke-width="2"/><text x="25" y="180" font-size="12" font-weight="bold" fill="#064E3B">TEST PARAMETER</text><text x="230" y="180" font-size="12" font-weight="bold" fill="#064E3B">RESULT</text><text x="350" y="180" font-size="12" font-weight="bold" fill="#064E3B">REFERENCE</text><text x="490" y="180" font-size="12" font-weight="bold" fill="#064E3B">STATUS</text><line x1="25" y1="190" x2="575" y2="190" stroke="#064E3B" stroke-width="1.5"/><text x="25" y="220" font-size="12">HbA1c Glycated Hemoglobin</text><text x="230" y="220" font-size="12" font-weight="bold">6.5 %</text><text x="350" y="220" font-size="12">4.0 - 5.6</text><text x="490" y="220" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="250" font-size="12">Fasting Blood Glucose</text><text x="230" y="250" font-size="12" font-weight="bold">116 mg/dL</text><text x="350" y="250" font-size="12">70 - 99</text><text x="490" y="250" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="280" font-size="12">LDL Bad Cholesterol</text><text x="230" y="280" font-size="12" font-weight="bold">132 mg/dL</text><text x="350" y="280" font-size="12">0 - 100</text><text x="490" y="280" font-size="12" font-weight="bold" fill="#DC2626">HIGH</text><text x="25" y="310" font-size="12">Hemoglobin</text><text x="230" y="310" font-size="12" font-weight="bold">11.4 g/dL</text><text x="350" y="310" font-size="12">12.0 - 15.5</text><text x="490" y="310" font-size="12" font-weight="bold" fill="#2563EB">LOW</text><text x="25" y="340" font-size="12">Vitamin D 25-Hydroxy</text><text x="230" y="340" font-size="12" font-weight="bold">22 ng/mL</text><text x="350" y="340" font-size="12">30 - 100</text><text x="490" y="340" font-size="12" font-weight="bold" fill="#2563EB">LOW</text></svg>')
        },
        {
          type: 'Prescription',
          date: '2026-03-18',
          dx: 'Prediabetes, Iron deficiency',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [],
          meds: [
            { n: 'Tab Metformin Hydrochloride', dose: '500mg', freq: '1-0-0', days: 30 },
            { n: 'Tab Ferrous Ascorbate', dose: '100mg', freq: '0-1-0', days: 60 }
          ],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#0F766E"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#CCFBF1">OPD PRESCRIPTION &middot; DR. RAJESH SHARMA, MD</text><text x="25" y="115" font-size="13" font-weight="bold">PATIENT: ANITHA &middot; DATE: 18 MAR 2026</text><text x="25" y="180" font-size="13" font-weight="bold" fill="#0F766E">DIAGNOSIS: Prediabetes, Mild Anemia</text><text x="35" y="240" font-size="13" font-weight="bold">1. Tab Metformin 500mg (1-0-0) x 30 days</text><text x="35" y="290" font-size="13" font-weight="bold">2. Tab Ferrous Ascorbate 100mg (0-1-0) x 60 days</text></svg>')
        },
        {
          type: 'Lab report',
          date: '2026-03-12',
          dx: 'Metabolic & Glycemic Screening',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [
            { n: 'HbA1c', v: 6.8, u: '%', lo: 4.0, hi: 5.6 },
            { n: 'Fasting Glucose', v: 124, u: 'mg/dL', lo: 70, hi: 99 },
            { n: 'LDL Cholesterol', v: 138, u: 'mg/dL', lo: 0, hi: 100 },
            { n: 'Hemoglobin', v: 11.0, u: 'g/dL', lo: 12.0, hi: 15.5 },
            { n: 'Vitamin D', v: 18, u: 'ng/mL', lo: 30, hi: 100 },
            { n: 'Total Cholesterol', v: 205, u: 'mg/dL', lo: 125, hi: 200 }
          ],
          meds: [],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#064E3B"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#A7F3D0">CENTRAL CLINICAL PATHOLOGY &middot; DATE: 12 MAR 2026</text><text x="25" y="115" font-size="13" font-weight="bold">PATIENT: ANITHA (FEMALE / 52Y)</text><text x="25" y="180" font-size="12" font-weight="bold">HbA1c: 6.8 % (HIGH)</text><text x="25" y="210" font-size="12" font-weight="bold">Fasting Glucose: 124 mg/dL (HIGH)</text><text x="25" y="240" font-size="12" font-weight="bold">LDL: 138 mg/dL (HIGH)</text><text x="25" y="270" font-size="12" font-weight="bold">Hemoglobin: 11.0 g/dL (LOW)</text></svg>')
        },
        {
          type: 'Clinical Consultation',
          date: '2026-01-10',
          dx: 'Executive Health Checkup & Lifestyle Assessment',
          doctor: 'Dr. Rajesh Sharma, MD',
          verified: true,
          labs: [],
          meds: [],
          doc: makeDocSvg('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><rect width="100%" height="80" fill="#0E2A3B"/><text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text><text x="25" y="64" font-size="11" fill="#93C5FD">ANNUAL EXECUTIVE HEALTH EVALUATION &middot; 10 JAN 2026</text><text x="25" y="115" font-size="13" font-weight="bold">PATIENT: ANITHA (52Y / FEMALE) &middot; EXAMINER: DR. RAJESH SHARMA, MD</text><text x="25" y="170" font-size="12">Vitals: BP 138/88 mmHg, Pulse 76 bpm. Advised routine fasting lab profile.</text></svg>')
        }
      ]
    },
    {
      id: 'abha-001',
      abhaNumber: '91-4829-1029-4819',
      abhaAddress: 'ramesh.c@abdm',
      name: 'Ramesh Chandra',
      age: '54',
      dob: '1972-06-15',
      gender: 'male',
      phone: '+91 98765 43210',
      email: 'ramesh.c@example.com',
      bloodGroup: 'B+',
      status: 'VERIFIED_ABDM',
      createdAt: '2026-03-01T10:00:00Z'
    },
    {
      id: 'abha-002',
      abhaNumber: '91-1209-3381-9920',
      abhaAddress: 'meera.deshmukh@abdm',
      name: 'Meera Deshmukh',
      age: '42',
      dob: '1984-03-22',
      gender: 'female',
      phone: '+91 98112 33445',
      email: 'meera.d@example.com',
      bloodGroup: 'O+',
      status: 'VERIFIED_ABDM',
      createdAt: '2026-03-02T11:00:00Z'
    },
    {
      id: 'abha-003',
      abhaNumber: '91-6677-8899-0011',
      abhaAddress: 'kavita.reddy@abdm',
      name: 'Kavita Reddy',
      age: '36',
      dob: '1990-11-08',
      gender: 'female',
      phone: '+91 97001 22334',
      email: 'kavita.r@example.com',
      bloodGroup: 'A+',
      status: 'VERIFIED_ABDM',
      createdAt: '2026-03-03T12:00:00Z'
    }
  ]
});

// Auto-migrate in-memory patient records to Base64 data URIs
if (memoryStore && memoryStore.abhaPatients) {
  memoryStore.abhaPatients.forEach(p => {
    (p.records || []).forEach(r => {
      if (r.doc && typeof r.doc === 'string' && r.doc.startsWith('data:image/svg+xml;utf8,')) {
        const rawSvg = r.doc.slice('data:image/svg+xml;utf8,'.length);
        r.doc = makeDocSvg(rawSvg);
      }
    });
  });
}

// Helper to query Supabase REST if available
async function supabaseFetch(endpoint, method = 'GET', body = null) {
  const url = clean(process.env.SUPABASE_URL).replace(/\/$/, '');
  const key = clean(process.env.SUPABASE_ANON_KEY);
  if (!url || !key) return null;

  try {
    const opts = {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: method === 'POST' ? 'return=representation' : undefined
      },
      signal: AbortSignal.timeout(6000)
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${url}/rest/v1/${endpoint}`, opts);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

module.exports = async (req, res) => {
  // Allow OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Medoryx');
    return res.status(200).end();
  }

  // Security guard: protect against CSRF & abusive flooding
  if (!(await guard(req, res, 'hospital', 120))) return;

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = req.query?.action || urlObj.searchParams.get('action') || (req.body && req.body.action);

  try {
    switch (action) {
      // -------------------------------------------------------------
      // 1. HOSPITAL REGISTRATION (Public Onboarding)
      // -------------------------------------------------------------
      case 'register': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { name, registrationNumber, email, phone, address, departments, adminName, adminPassword } = req.body || {};

        if (!name || !registrationNumber || !email) {
          return res.status(400).json({ error: 'Hospital Name, Registration Number, and Official Email are required.' });
        }

        const newHospital = {
          id: `hosp-${Date.now().toString(36)}`,
          name: clean(name).slice(0, 120),
          registrationNumber: clean(registrationNumber).slice(0, 50),
          email: clean(email).slice(0, 100),
          phone: clean(phone || '').slice(0, 25),
          address: clean(address || '').slice(0, 250),
          departments: clean(departments || 'General Medicine, Diagnostics, Pharmacy').slice(0, 200),
          status: 'pending', // Pending approval by Super Admin
          createdAt: new Date().toISOString()
        };

        // Create initial Hospital Admin profile
        const newAdmin = {
          id: `usr-${Date.now().toString(36)}`,
          hospitalId: newHospital.id,
          role: 'hospital_admin',
          fullName: clean(adminName || `${name} Administrator`).slice(0, 80),
          email: newHospital.email,
          phone: newHospital.phone,
          specialization: 'Hospital Administration',
          licenseNumber: newHospital.registrationNumber,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        memoryStore.hospitals.unshift(newHospital);
        memoryStore.userProfiles.unshift(newAdmin);

        // Async sync to Supabase if configured
        supabaseFetch('hospitals', 'POST', {
          name: newHospital.name,
          registration_number: newHospital.registrationNumber,
          email: newHospital.email,
          phone: newHospital.phone,
          address: newHospital.address,
          status: 'pending'
        }).catch(() => {});

        return res.status(200).json({
          ok: true,
          message: 'Hospital registered successfully. Awaiting Super Admin approval.',
          hospital: newHospital,
          admin: newAdmin
        });
      }

      // -------------------------------------------------------------
      // 2. SUPER ADMIN: LIST & APPROVE HOSPITALS
      // -------------------------------------------------------------
      case 'hospitals': {
        const filterStatus = req.query?.status || urlObj.searchParams.get('status');
        let list = memoryStore.hospitals;
        if (filterStatus) {
          list = list.filter(h => h.status === filterStatus);
        }
        return res.status(200).json({
          ok: true,
          hospitals: list,
          total: memoryStore.hospitals.length,
          active: memoryStore.hospitals.filter(h => h.status === 'active').length,
          pending: memoryStore.hospitals.filter(h => h.status === 'pending').length
        });
      }

      case 'approve': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { hospitalId, status } = req.body || {};
        const hosp = memoryStore.hospitals.find(h => h.id === hospitalId);
        if (!hosp) return res.status(404).json({ error: 'Hospital not found.' });

        hosp.status = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'pending';

        supabaseFetch(`hospitals?registration_number=eq.${encodeURIComponent(hosp.registrationNumber)}`, 'PATCH', {
          status: hosp.status
        }).catch(() => {});

        return res.status(200).json({ ok: true, hospital: hosp });
      }

      // -------------------------------------------------------------
      // 3. SUPER ADMIN: ALL USERS / GLOBAL AUDIT DIRECTORY
      // -------------------------------------------------------------
      case 'users': {
        const safeUsers = memoryStore.userProfiles.map(({ password: _pw, ...rest }) => rest);
        return res.status(200).json({
          ok: true,
          users: safeUsers,
          stats: {
            totalUsers: memoryStore.userProfiles.length,
            doctors: memoryStore.userProfiles.filter(u => u.role === 'doctor').length,
            labTechs: memoryStore.userProfiles.filter(u => u.role === 'lab_technician').length,
            pharmacists: memoryStore.userProfiles.filter(u => u.role === 'pharmacist').length,
            receptionists: memoryStore.userProfiles.filter(u => u.role === 'receptionist').length,
            hospitalAdmins: memoryStore.userProfiles.filter(u => u.role === 'hospital_admin').length,
            patients: memoryStore.userProfiles.filter(u => u.role === 'patient').length
          }
        });
      }

      // -------------------------------------------------------------
      // 4. HOSPITAL ADMIN: CREATE STAFF LOGINS (Doctor, Lab Tech, Pharmacist, Receptionist)
      // -------------------------------------------------------------
      case 'create-staff': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { hospitalId, fullName, email, password, role, specialization, licenseNumber, phone } = req.body || {};

        const validRoles = ['doctor', 'lab_technician', 'pharmacist', 'receptionist'];
        if (!validRoles.includes(role)) {
          return res.status(400).json({
            error: `Invalid staff role. Permitted roles are: ${validRoles.join(', ')}. (Nurse is decommissioned)`
          });
        }

        if (!fullName || !email) {
          return res.status(400).json({ error: 'Full name and email are required to provision staff.' });
        }

        // Check if user already exists
        const exists = memoryStore.userProfiles.some(u => u.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          return res.status(400).json({ error: 'A staff member or user with this email address already exists.' });
        }

        const newStaff = {
          id: `usr-${Date.now().toString(36)}`,
          hospitalId: hospitalId || 'hosp-001',
          role: role,
          fullName: clean(fullName).slice(0, 80),
          email: clean(email).toLowerCase().slice(0, 100),
          phone: clean(phone || '').slice(0, 25),
          specialization: clean(specialization || (role === 'doctor' ? 'General Physician' : role === 'lab_technician' ? 'Clinical Pathology' : role === 'pharmacist' ? 'Pharmacy Dispenser' : 'Front Desk')).slice(0, 100),
          licenseNumber: clean(licenseNumber || '').slice(0, 50),
          password: clean(password || 'StaffPass@2026'),
          isActive: true,
          createdAt: new Date().toISOString()
        };

        memoryStore.userProfiles.push(newStaff);

        const { password: _pw, ...safeStaff } = newStaff;
        return res.status(200).json({
          ok: true,
          message: `Account for ${newStaff.fullName} (${newStaff.role}) provisioned successfully under hospital.`,
          staff: safeStaff
        });
      }

      case 'staff': {
        const hospitalId = req.query?.hospitalId || urlObj.searchParams.get('hospitalId') || 'hosp-001';
        const staff = memoryStore.userProfiles
          .filter(u => u.hospitalId === hospitalId || !u.hospitalId)
          .map(({ password: _pw, ...rest }) => rest);
        return res.status(200).json({ ok: true, staff });
      }

      case 'login': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
        const normalizedEmail = clean(email).toLowerCase();
        if (normalizedEmail === 'superadmin@medoryx.example.com') {
          if (password !== 'SuperAdmin@2026') {
            return res.status(401).json({ error: 'Invalid email or password.' });
          }
          return res.status(200).json({
            ok: true,
            user: { role: 'super_admin', fullName: 'Dr. Vikramaditya Rao', email: normalizedEmail }
          });
        }
        const user = memoryStore.userProfiles.find(u => u.email.toLowerCase() === normalizedEmail);
        if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
        const expectedPw = user.password || (user.role === 'hospital_admin' ? 'HospAdmin@2026' : 'StaffPass@2026');
        if (password !== expectedPw) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }
        return res.status(200).json({
          ok: true,
          user: { id: user.id, role: user.role, fullName: user.fullName, email: user.email, hospitalId: user.hospitalId }
        });
      }

      // -------------------------------------------------------------
      // 5. RECEPTIONIST: PATIENT CHECK-IN & QUEUE
      // -------------------------------------------------------------
      case 'checkin': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { hospitalId, patientName, patientPhone, patientAge, patientGender, abhaNumber, assignedDoctorId, chiefComplaint } = req.body || {};

        if (!patientName) {
          return res.status(400).json({ error: 'Patient name is required.' });
        }

        const doctor = memoryStore.userProfiles.find(u => u.id === assignedDoctorId) ||
          memoryStore.userProfiles.find(u => u.role === 'doctor') ||
          { id: 'usr-doc-1', fullName: 'Dr. Rajesh Sharma, MD' };

        const token = memoryStore.encounters.length + 101;

        const newEncounter = {
          id: `enc-${Date.now().toString(36)}`,
          hospitalId: hospitalId || 'hosp-001',
          patientName: clean(patientName).slice(0, 80),
          patientPhone: clean(patientPhone || '').slice(0, 25),
          patientAge: clean(String(patientAge || '')).slice(0, 4),
          patientGender: ['male', 'female', 'other'].includes(patientGender) ? patientGender : 'other',
          abhaNumber: clean(abhaNumber || '').slice(0, 30),
          assignedDoctorId: doctor.id,
          doctorName: doctor.fullName,
          chiefComplaint: clean(chiefComplaint || 'Consultation').slice(0, 300),
          tokenNumber: token,
          status: 'registered', // registered -> in_consult -> tests_pending -> prescribed -> completed
          createdAt: new Date().toISOString()
        };

        memoryStore.encounters.unshift(newEncounter);

        return res.status(200).json({
          ok: true,
          message: `Patient ${newEncounter.patientName} checked in. Assigned Token #${token}.`,
          encounter: newEncounter
        });
      }

      case 'encounters': {
        const hospitalId = req.query?.hospitalId || urlObj.searchParams.get('hospitalId') || 'hosp-001';
        const docId = req.query?.doctorId || urlObj.searchParams.get('doctorId');
        let list = memoryStore.encounters.filter(e => e.hospitalId === hospitalId);
        if (docId) {
          list = list.filter(e => e.assignedDoctorId === docId);
        }
        return res.status(200).json({ ok: true, encounters: list });
      }

      // -------------------------------------------------------------
      // 6. DOCTOR: LAB TEST ORDERING & E-PRESCRIPTION CREATION
      // -------------------------------------------------------------
      case 'order-test': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { encounterId, hospitalId, doctorId, testName, testCode, sampleType, notes } = req.body || {};

        if (!encounterId || !testName) {
          return res.status(400).json({ error: 'Encounter ID and Test Name are required.' });
        }

        const encounter = memoryStore.encounters.find(e => e.id === encounterId);
        if (encounter) {
          encounter.status = 'tests_pending';
        }

        const newLabOrder = {
          id: `lab-ord-${Date.now().toString(36)}`,
          encounterId: encounterId,
          hospitalId: hospitalId || (encounter ? encounter.hospitalId : 'hosp-001'),
          doctorId: doctorId || (encounter ? encounter.assignedDoctorId : 'usr-doc-1'),
          patientName: encounter ? encounter.patientName : 'Walk-in Patient',
          testName: clean(testName).slice(0, 150),
          testCode: clean(testCode || 'LOINC-GENERIC').slice(0, 50),
          sampleType: clean(sampleType || 'Venous Blood').slice(0, 50),
          status: 'ordered',
          results: [],
          technicianId: null,
          notes: clean(notes || '').slice(0, 200),
          createdAt: new Date().toISOString()
        };

        memoryStore.labOrders.unshift(newLabOrder);

        return res.status(200).json({
          ok: true,
          message: `Diagnostic test ordered: ${newLabOrder.testName}. Forwarded to Lab Technician queue.`,
          order: newLabOrder
        });
      }

      case 'create-rx': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { encounterId, hospitalId, doctorId, medications, clinicalNotes } = req.body || {};

        if (!encounterId || !Array.isArray(medications) || !medications.length) {
          return res.status(400).json({ error: 'Encounter ID and at least one medication are required.' });
        }

        const encounter = memoryStore.encounters.find(e => e.id === encounterId);
        if (encounter) {
          encounter.status = 'prescribed';
        }

        const newRx = {
          id: `rx-ord-${Date.now().toString(36)}`,
          encounterId: encounterId,
          hospitalId: hospitalId || (encounter ? encounter.hospitalId : 'hosp-001'),
          doctorId: doctorId || (encounter ? encounter.assignedDoctorId : 'usr-doc-1'),
          patientName: encounter ? encounter.patientName : 'Walk-in Patient',
          medications: medications.map(m => ({
            name: clean(m.name || '').slice(0, 80),
            dose: clean(m.dose || '').slice(0, 30),
            freq: clean(m.freq || '1-0-1').slice(0, 20),
            days: parseInt(m.days, 10) || 15,
            instructions: clean(m.instructions || 'After food').slice(0, 150)
          })),
          clinicalNotes: clean(clinicalNotes || '').slice(0, 400),
          dispenseStatus: 'pending',
          pharmacistId: null,
          dispensedAt: null,
          createdAt: new Date().toISOString()
        };

        memoryStore.prescriptions.unshift(newRx);

        return res.status(200).json({
          ok: true,
          message: `Prescription issued with ${newRx.medications.length} medication(s). Forwarded to Pharmacy queue.`,
          prescription: newRx
        });
      }

      // -------------------------------------------------------------
      // 7. LAB TECHNICIAN: QUEUE & TEST RESULT ENTRY
      // -------------------------------------------------------------
      case 'lab-orders': {
        const hospitalId = req.query?.hospitalId || urlObj.searchParams.get('hospitalId') || 'hosp-001';
        const orders = memoryStore.labOrders.filter(o => o.hospitalId === hospitalId);
        return res.status(200).json({ ok: true, orders });
      }

      case 'complete-lab': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { orderId, results, technicianId, notes } = req.body || {};

        const order = memoryStore.labOrders.find(o => o.id === orderId);
        if (!order) return res.status(404).json({ error: 'Diagnostic lab order not found.' });

        order.status = 'completed';
        order.results = Array.isArray(results) ? results : [];
        order.technicianId = technicianId || 'usr-lab-1';
        order.notes = clean(notes || order.notes || '').slice(0, 200);
        order.completedAt = new Date().toISOString();

        // Also check if encounter should be updated
        const enc = memoryStore.encounters.find(e => e.id === order.encounterId);
        if (enc && enc.status === 'tests_pending') {
          enc.status = 'in_consult';
        }

        return res.status(200).json({
          ok: true,
          message: `Lab results verified and published for ${order.patientName}.`,
          order
        });
      }

      // -------------------------------------------------------------
      // 8. PHARMACIST: PRESCRIPTION QUEUE & DISPENSATION
      // -------------------------------------------------------------
      case 'prescriptions': {
        const hospitalId = req.query?.hospitalId || urlObj.searchParams.get('hospitalId') || 'hosp-001';
        const rxs = memoryStore.prescriptions.filter(r => r.hospitalId === hospitalId);
        return res.status(200).json({ ok: true, prescriptions: rxs });
      }

      case 'dispense-rx': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { prescriptionId, pharmacistId, status, notes } = req.body || {};

        const rx = memoryStore.prescriptions.find(r => r.id === prescriptionId);
        if (!rx) return res.status(404).json({ error: 'Prescription not found.' });

        rx.dispenseStatus = status === 'partial' ? 'partial' : 'dispensed';
        rx.pharmacistId = pharmacistId || 'usr-pharma-1';
        rx.dispensedAt = new Date().toISOString();
        if (notes) rx.dispenseNotes = clean(notes).slice(0, 200);

        // Update encounter to completed if medicine is fully dispensed
        const enc = memoryStore.encounters.find(e => e.id === rx.encounterId);
        if (enc) {
          enc.status = 'completed';
        }

        return res.status(200).json({
          ok: true,
          message: `Prescription dispensed for ${rx.patientName}. Dosage instructions verified.`,
          prescription: rx
        });
      }

      // -------------------------------------------------------------
      // 9. CALENDAR APPOINTMENTS: PATIENT & DOCTOR CONNECTIVITY
      // -------------------------------------------------------------
      case 'appointments': {
        const docId = req.query?.doctorId || urlObj.searchParams.get('doctorId');
        const patEmail = req.query?.patientEmail || urlObj.searchParams.get('patientEmail');
        const hospId = req.query?.hospitalId || urlObj.searchParams.get('hospitalId') || 'hosp-001';
        let list = memoryStore.appointments || [];
        if (docId) {
          list = list.filter(a => a.doctorId === docId);
        } else if (patEmail) {
          list = list.filter(a => a.patientEmail && a.patientEmail.toLowerCase() === patEmail.toLowerCase());
        } else if (hospId) {
          list = list.filter(a => a.hospitalId === hospId);
        }
        return res.status(200).json({ ok: true, appointments: list });
      }

      case 'book-appointment': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { hospitalId, doctorId, patientName, patientEmail, patientPhone, patientAge, patientGender, date, timeSlot, reason, notes } = req.body || {};
        if (!doctorId || !date || !timeSlot || !reason) {
          return res.status(400).json({ error: 'Doctor, Date, Time Slot, and Reason for consultation are required.' });
        }
        const doc = memoryStore.userProfiles.find(u => u.id === doctorId) || { fullName: 'Dr. Rajesh Sharma, MD' };
        const hosp = memoryStore.hospitals.find(h => h.id === hospitalId) || { name: 'City Care Multi-Speciality Hospital' };
        const newApt = {
          id: 'apt-' + Date.now().toString(36),
          hospitalId: hospitalId || 'hosp-001',
          hospitalName: hosp.name,
          doctorId: doctorId,
          doctorName: doc.fullName,
          patientName: clean(patientName || 'Patient').slice(0, 80),
          patientEmail: clean(patientEmail || '').toLowerCase().slice(0, 100),
          patientPhone: clean(patientPhone || '').slice(0, 25),
          patientAge: clean(patientAge || '').slice(0, 5),
          patientGender: clean(patientGender || '').slice(0, 10),
          date: clean(date).slice(0, 12),
          timeSlot: clean(timeSlot).slice(0, 20),
          reason: clean(reason).slice(0, 200),
          notes: clean(notes || '').slice(0, 300),
          status: 'pending',
          doctorNotes: '',
          createdAt: new Date().toISOString()
        };
        if (!memoryStore.appointments) memoryStore.appointments = [];
        memoryStore.appointments.unshift(newApt);
        return res.status(200).json({
          ok: true,
          message: 'Appointment request sent to ' + newApt.doctorName + '. The doctor will review and confirm your slot.',
          appointment: newApt
        });
      }

      case 'accept-appointment': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { appointmentId, doctorNotes } = req.body || {};
        const apt = (memoryStore.appointments || []).find(a => a.id === appointmentId);
        if (!apt) return res.status(404).json({ error: 'Appointment not found.' });
        apt.status = 'accepted';
        apt.doctorNotes = clean(doctorNotes || 'Appointment confirmed. Please report to OPD Room 101 with previous records.').slice(0, 200);
        apt.acceptedAt = new Date().toISOString();
        return res.status(200).json({
          ok: true,
          message: `Appointment for ${apt.patientName} accepted for ${apt.date} at ${apt.timeSlot}.`,
          appointment: apt
        });
      }

      case 'decline-appointment': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { appointmentId, reason } = req.body || {};
        const apt = (memoryStore.appointments || []).find(a => a.id === appointmentId);
        if (!apt) return res.status(404).json({ error: 'Appointment not found.' });
        apt.status = 'declined';
        apt.doctorNotes = clean(reason || 'Slot unavailable. Please choose another time.').slice(0, 200);
        apt.declinedAt = new Date().toISOString();
        return res.status(200).json({
          ok: true,
          message: `Appointment declined for ${apt.patientName}.`,
          appointment: apt
        });
      }

      case 'checkin-appointment': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { appointmentId } = req.body || {};
        const apt = (memoryStore.appointments || []).find(a => a.id === appointmentId);
        if (!apt) return res.status(404).json({ error: 'Appointment not found.' });
        
        const nextToken = memoryStore.encounters.length ? Math.max(...memoryStore.encounters.map(e => e.tokenNumber || 100)) + 1 : 101;
        const newEnc = {
          id: 'enc-' + Date.now().toString(36),
          hospitalId: apt.hospitalId,
          patientName: apt.patientName,
          patientPhone: apt.patientPhone,
          patientAge: apt.patientAge || '40',
          patientGender: apt.patientGender || 'other',
          abhaNumber: '',
          assignedDoctorId: apt.doctorId,
          doctorName: apt.doctorName,
          chiefComplaint: apt.reason,
          tokenNumber: nextToken,
          status: 'in_consult',
          appointmentId: apt.id,
          createdAt: new Date().toISOString()
        };
        memoryStore.encounters.unshift(newEnc);
        apt.status = 'completed';
        apt.encounterId = newEnc.id;
        return res.status(200).json({
          ok: true,
          message: `Patient ${apt.patientName} checked in. Assigned Token #${nextToken} to ${apt.doctorName}.`,
          encounter: newEnc,
          appointment: apt
        });
      }

      // -------------------------------------------------------------
      // 9. PATIENT ABHA REGISTRATION & CREATION
      // -------------------------------------------------------------
      case 'abha-register': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { name, age, dob, gender, phone, email, abhaAddress, abhaNumber, bloodGroup } = req.body || {};
        
        const cleanName = clean(name || 'Ayushman Beneficiary').slice(0, 80);
        let finalAbhaNum = clean(abhaNumber || '').replace(/[^\d-]/g, '');
        
        // Generate valid 14-digit ABHA ID if not provided: 91-XXXX-XXXX-XXXX
        if (!finalAbhaNum || finalAbhaNum.replace(/\D/g, '').length !== 14) {
          const r1 = Math.floor(1000 + Math.random() * 9000);
          const r2 = Math.floor(1000 + Math.random() * 9000);
          const r3 = Math.floor(1000 + Math.random() * 9000);
          finalAbhaNum = `91-${r1}-${r2}-${r3}`;
        } else if (!finalAbhaNum.includes('-')) {
          finalAbhaNum = finalAbhaNum.replace(/(\d{2})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
        }

        let finalAddr = clean(abhaAddress || '').trim().toLowerCase();
        if (!finalAddr) {
          const baseName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
          finalAddr = `${baseName}@abdm`;
        } else if (!finalAddr.includes('@')) {
          finalAddr = `${finalAddr}@abdm`;
        }

        if (!memoryStore.abhaPatients) memoryStore.abhaPatients = [];

        // 1. Enforce global uniqueness: Check if another patient already has this 14-digit ABHA number
        const rawDigits = finalAbhaNum.replace(/\D/g, '');
        const duplicate = (memoryStore.abhaPatients || []).find(p => {
          const pDigits = p.abhaNumber.replace(/\D/g, '');
          const isSameId = (pDigits === rawDigits) || (p.abhaNumber === finalAbhaNum);
          const isDifferentPerson = (phone && p.phone && p.phone !== clean(phone)) &&
                                    (cleanName && p.name && p.name.toLowerCase() !== cleanName.toLowerCase());
          return isSameId && isDifferentPerson;
        });

        if (duplicate) {
          return res.status(400).json({
            ok: false,
            error: `ABHA ID "${finalAbhaNum}" is already registered to another citizen (${duplicate.name}). Every citizen must have a unique 14-digit ABHA ID.`
          });
        }

        // Check if patient already registered with this ABHA number or phone
        let existing = memoryStore.abhaPatients.find(p => 
          p.abhaNumber === finalAbhaNum || 
          (phone && p.phone === clean(phone)) ||
          p.abhaAddress.toLowerCase() === finalAddr.toLowerCase()
        );

        if (existing) {
          existing.name = cleanName;
          existing.abhaNumber = finalAbhaNum;
          existing.abhaAddress = finalAddr;
          if (age) existing.age = String(clean(age)).slice(0, 4);
          if (dob) existing.dob = clean(dob).slice(0, 12);
          if (gender) existing.gender = clean(gender).slice(0, 10);
          if (phone) existing.phone = clean(phone).slice(0, 25);
          if (email) existing.email = clean(email).slice(0, 100);
          if (bloodGroup) existing.bloodGroup = clean(bloodGroup).slice(0, 10);
          if (Array.isArray(req.body.records)) existing.records = req.body.records;
          existing.updatedAt = new Date().toISOString();
        } else {
          existing = {
            id: `abha-${Date.now().toString(36)}`,
            abhaNumber: finalAbhaNum,
            abhaAddress: finalAddr,
            name: cleanName,
            age: clean(age || '35').slice(0, 4),
            dob: clean(dob || '1991-01-01').slice(0, 12),
            gender: clean(gender || 'other').slice(0, 10),
            phone: clean(phone || '+91 98765 43210').slice(0, 25),
            email: clean(email || '').slice(0, 100),
            bloodGroup: clean(bloodGroup || 'B+').slice(0, 10),
            status: 'VERIFIED_ABDM',
            records: Array.isArray(req.body.records) ? req.body.records : [],
            createdAt: new Date().toISOString()
          };
          memoryStore.abhaPatients.unshift(existing);
        }

        // Link with any existing encounters or appointments
        (memoryStore.encounters || []).forEach(e => {
          if (e.patientName.toLowerCase() === cleanName.toLowerCase() || (phone && e.patientPhone === clean(phone))) {
            e.abhaNumber = finalAbhaNum;
          }
        });

        // Convert patient records to longitudinal lab orders and prescriptions if provided
        if (Array.isArray(req.body.records) && req.body.records.length > 0) {
          let enc = (memoryStore.encounters || []).find(e => e.abhaNumber === finalAbhaNum || e.patientName.toLowerCase() === cleanName.toLowerCase());
          if (!enc) {
            enc = {
              id: 'enc-' + Date.now().toString(36),
              hospitalId: 'hosp-001',
              patientName: cleanName,
              patientPhone: clean(phone || '+91 98765 43210'),
              patientAge: clean(age || '35'),
              patientGender: clean(gender || 'female'),
              abhaNumber: finalAbhaNum,
              assignedDoctorId: 'usr-doc-1',
              doctorName: 'Dr. Rajesh Sharma, MD',
              chiefComplaint: 'ABDM Longitudinal Clinical Records Synced',
              tokenNumber: (memoryStore.encounters || []).length + 101,
              status: 'in_consult',
              createdAt: new Date().toISOString()
            };
            memoryStore.encounters.unshift(enc);
          }
          req.body.records.forEach((r, idx) => {
            if (r.labs && r.labs.length > 0) {
              const testNames = r.labs.map(l => l.n).slice(0, 3).join(', ');
              const labOrder = {
                id: 'lab-ord-abha-' + Date.now().toString(36) + '-' + idx,
                encounterId: enc.id,
                hospitalId: 'hosp-001',
                doctorId: 'usr-doc-1',
                patientName: cleanName,
                testName: r.type || ('Diagnostic Panel: ' + testNames),
                testCode: 'LOINC-ABDM-' + (idx + 1),
                sampleType: 'Venous Blood / Specimen',
                status: 'completed',
                results: r.labs.map(l => ({
                  test: l.n,
                  value: l.v,
                  unit: l.u || '',
                  rangeLow: l.lo != null ? l.lo : 70,
                  rangeHigh: l.hi != null ? l.hi : 100,
                  status: (l.v != null && l.hi != null && l.v > l.hi) ? 'High' : (l.v != null && l.lo != null && l.v < l.lo) ? 'Low' : 'Normal',
                  loinc: 'LOINC-' + (Math.floor(1000 + Math.random() * 9000))
                })),
                technicianId: 'usr-lab-1',
                completedAt: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
                createdAt: r.date ? new Date(r.date).toISOString() : new Date().toISOString()
              };
              if (!memoryStore.labOrders.some(lo => lo.patientName.toLowerCase() === cleanName.toLowerCase() && lo.createdAt === labOrder.createdAt)) {
                memoryStore.labOrders.unshift(labOrder);
              }
            }
            if (r.meds && r.meds.length > 0) {
              const rx = {
                id: 'rx-abha-' + Date.now().toString(36) + '-' + idx,
                encounterId: enc.id,
                hospitalId: 'hosp-001',
                doctorId: 'usr-doc-1',
                patientName: cleanName,
                medications: r.meds.map(m => ({
                  name: m.n,
                  dose: m.dose || 'Standard',
                  freq: m.freq || '1-0-0',
                  days: m.days || 30,
                  instructions: 'As prescribed by physician.'
                })),
                clinicalNotes: r.dx || 'Clinical prescription synchronized via Ayushman Bharat Digital Mission (ABDM).',
                dispenseStatus: 'dispensed',
                pharmacistId: 'usr-pharma-1',
                dispensedAt: new Date().toISOString(),
                createdAt: r.date ? new Date(r.date).toISOString() : new Date().toISOString()
              };
              if (!memoryStore.prescriptions.some(p => p.patientName.toLowerCase() === cleanName.toLowerCase() && p.createdAt === rx.createdAt)) {
                memoryStore.prescriptions.unshift(rx);
              }
            }
          });
        }

        return res.status(200).json({
          ok: true,
          message: 'Official 14-Digit ABHA Health ID created and linked successfully.',
          abha: existing
        });
      }

      // -------------------------------------------------------------
      // 10. DOCTOR ABHA PATIENT RECORD LOOKUP
      // -------------------------------------------------------------
      case 'abha-lookup': {
        const queryAbha = req.query?.abhaId || urlObj.searchParams.get('abhaId') || (req.body && req.body.abhaId);
        if (!queryAbha) {
          return res.status(400).json({ ok: false, error: 'ABHA ID or Address is required for record lookup.' });
        }

        const rawDigits = String(queryAbha).replace(/\D/g, '');
        const cleanQuery = clean(queryAbha).trim().toLowerCase();

        // 1. Search in abhaPatients
        let patient = (memoryStore.abhaPatients || []).find(p => {
          const pDigits = (p.abhaNumber || '').replace(/\D/g, '');
          const isDigitMatch = rawDigits.length >= 8 && (pDigits === rawDigits || pDigits.endsWith(rawDigits) || rawDigits.endsWith(pDigits));
          return isDigitMatch ||
                 (p.abhaNumber && p.abhaNumber.toLowerCase() === cleanQuery) ||
                 (p.abhaAddress && p.abhaAddress.toLowerCase() === cleanQuery) ||
                 (p.name && p.name.toLowerCase() === cleanQuery) ||
                 (rawDigits.length >= 10 && p.phone && p.phone.replace(/\D/g, '').endsWith(rawDigits));
        });

        // 2. Search in encounters if not found in abhaPatients
        const matchingEncounters = (memoryStore.encounters || []).filter(e => {
          const eDigits = (e.abhaNumber || '').replace(/\D/g, '');
          const isDigitMatch = rawDigits.length >= 8 && (eDigits === rawDigits || eDigits.endsWith(rawDigits) || rawDigits.endsWith(eDigits));
          return isDigitMatch ||
                 (e.abhaNumber && e.abhaNumber.toLowerCase() === cleanQuery) ||
                 (patient && e.patientName.toLowerCase() === patient.name.toLowerCase());
        });

        if (!patient && matchingEncounters.length > 0) {
          const topEnc = matchingEncounters[0];
          patient = {
            id: 'abha-enc-' + topEnc.id,
            abhaNumber: topEnc.abhaNumber || queryAbha,
            abhaAddress: `${topEnc.patientName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@abdm`,
            name: topEnc.patientName,
            age: topEnc.patientAge || '45',
            dob: '1981-01-01',
            gender: topEnc.patientGender || 'other',
            phone: topEnc.patientPhone || '',
            email: '',
            bloodGroup: 'B+',
            status: 'VERIFIED_ABDM'
          };
        }

        if (!patient) {
          return res.status(404).json({
            ok: false,
            found: false,
            error: `No ABDM patient records found for ABHA ID: "${queryAbha}". Please verify the 14-digit number.`
          });
        }

        // Gather all longitudinal records for this patient
        const encIds = matchingEncounters.map(e => e.id);
        const patientNameLower = patient.name.toLowerCase();

        const matchingLabOrders = (memoryStore.labOrders || []).filter(l => 
          encIds.includes(l.encounterId) || l.patientName.toLowerCase() === patientNameLower
        );

        const matchingPrescriptions = (memoryStore.prescriptions || []).filter(p => 
          encIds.includes(p.encounterId) || p.patientName.toLowerCase() === patientNameLower
        );

        const matchingAppointments = (memoryStore.appointments || []).filter(a => 
          (a.patientEmail && patient.email && a.patientEmail.toLowerCase() === patient.email.toLowerCase()) ||
          a.patientName.toLowerCase() === patientNameLower ||
          (patient.phone && a.patientPhone === patient.phone)
        );

        const patientDocuments = ((patient && Array.isArray(patient.records)) ? patient.records : []).map(r => {
          if (r.doc && typeof r.doc === 'string' && r.doc.startsWith('data:image/svg+xml;utf8,')) {
            return Object.assign({}, r, { doc: makeDocSvg(r.doc.slice('data:image/svg+xml;utf8,'.length)) });
          }
          return r;
        });
        return res.status(200).json({
          ok: true,
          found: true,
          patient: patient,
          documents: patientDocuments,
          encounters: matchingEncounters,
          labOrders: matchingLabOrders,
          prescriptions: matchingPrescriptions,
          appointments: matchingAppointments,
          recordsCount: {
            documents: patientDocuments.length,
            encounters: matchingEncounters.length,
            labOrders: matchingLabOrders.length,
            prescriptions: matchingPrescriptions.length,
            appointments: matchingAppointments.length
          }
        });
      }

      case 'attach-abha-doc': {
        if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
        const { abhaId, document: docData } = req.body || {};
        if (!abhaId || !docData) {
          return res.status(400).json({ ok: false, error: 'ABHA ID and document data are required.' });
        }

        const rawDigits = String(abhaId).replace(/\D/g, '');
        const cleanAbha = clean(abhaId).trim().toLowerCase();

        let patient = (memoryStore.abhaPatients || []).find(p => {
          const pDigits = (p.abhaNumber || '').replace(/\D/g, '');
          return (rawDigits.length >= 8 && (pDigits === rawDigits || pDigits.endsWith(rawDigits))) ||
                 (p.abhaNumber && p.abhaNumber.toLowerCase() === cleanAbha);
        });

        if (!patient) {
          return res.status(404).json({ ok: false, error: 'Patient with ABHA ID not found in registry.' });
        }

        patient.records = patient.records || [];

        // If no raw doc image provided, generate an official diagnostic SVG scan so it is never empty!
        let docImg = docData.doc;
        if (!docImg || typeof docImg !== 'string' || !docImg.trim()) {
          const docDate = docData.date || new Date().toISOString().slice(0, 10);
          const docType = docData.type || 'Clinical Document';
          const docDoctor = docData.doctor || 'Dr. Rajesh Sharma, MD';
          const docDx = docData.dx || 'Clinical Review';
          const labs = Array.isArray(docData.labs) ? docData.labs : [];
          const meds = Array.isArray(docData.meds) ? docData.meds : [];

          const labRowsSvg = labs.map((l, i) => {
            const y = 230 + (i * 30);
            const isHi = l.v > l.hi;
            const isLo = l.v < l.lo;
            const statusColor = isHi ? '#DC2626' : isLo ? '#2563EB' : '#16A34A';
            const statusText = isHi ? 'HIGH' : isLo ? 'LOW' : 'NORMAL';
            return `<text x="25" y="${y}" font-size="12">${l.n}</text><text x="230" y="${y}" font-size="12" font-weight="bold">${l.v} ${l.u||''}</text><text x="350" y="${y}" font-size="12">${l.lo||0} - ${l.hi||100}</text><text x="490" y="${y}" font-size="12" font-weight="bold" fill="${statusColor}">${statusText}</text>`;
          }).join('');

          const medRowsSvg = meds.map((m, i) => {
            const y = 240 + (i * 50);
            return `<rect x="25" y="${y}" width="550" height="42" rx="6" fill="#F8FAFC" stroke="#E2E8F0"/><text x="35" y="${y+18}" font-size="12" font-weight="bold">${m.n} ${m.dose||''}</text><text x="35" y="${y+34}" font-size="11" fill="#64748B">Schedule: ${m.freq||'1-0-0'} ${m.days ? '· ' + m.days + ' days' : ''}</text>`;
          }).join('');

          const generatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" style="background:#ffffff;font-family:sans-serif">
<rect width="100%" height="100%" fill="#ffffff"/>
<rect width="100%" height="80" fill="#0F766E"/>
<text x="25" y="42" font-size="18" font-weight="bold" fill="#ffffff">CITY CARE MULTI-SPECIALITY HOSPITAL</text>
<text x="25" y="64" font-size="11" fill="#CCFBF1">OFFICIAL ABDM CLINICAL RECORD · HEALTH ID REPOSITORY</text>
<text x="25" y="115" font-size="13" font-weight="bold" fill="#0F172A">PATIENT: ${patient.name.toUpperCase()} (${patient.gender ? patient.gender.toUpperCase() : 'PATIENT'} / ${patient.age}Y)</text>
<text x="25" y="135" font-size="12" fill="#64748B">ABHA ID: ${patient.abhaNumber} · PHONE: ${patient.phone}</text>
<text x="390" y="115" font-size="12" fill="#64748B">DATE: ${docDate}</text>
<text x="390" y="135" font-size="12" fill="#64748B">PHYSICIAN: ${docDoctor}</text>
<line x1="25" y1="150" x2="575" y2="150" stroke="#CBD5E1" stroke-width="2"/>
<text x="25" y="175" font-size="13" font-weight="bold" fill="#0F766E">DOCUMENT: ${docType.toUpperCase()}</text>
${docDx ? `<text x="25" y="195" font-size="12" fill="#334155">Diagnosis: ${docDx}</text>` : ''}
${labs.length ? `<line x1="25" y1="205" x2="575" y2="205" stroke="#0F766E" stroke-width="1.5"/><text x="25" y="220" font-size="11" font-weight="bold" fill="#0F766E">PARAMETER</text><text x="230" y="220" font-size="11" font-weight="bold" fill="#0F766E">VALUE</text><text x="350" y="220" font-size="11" font-weight="bold" fill="#0F766E">NORMAL</text><text x="490" y="220" font-size="11" font-weight="bold" fill="#0F766E">STATUS</text>${labRowsSvg}` : ''}
${meds.length ? `<text x="25" y="225" font-size="13" font-weight="bold" fill="#0F172A">Prescribed Medications:</text>${medRowsSvg}` : ''}
<line x1="25" y1="620" x2="575" y2="620" stroke="#CBD5E1" stroke-width="1"/>
<text x="25" y="650" font-size="11" fill="#64748B">DIGITALLY SIGNED &amp; VERIFIED BY: ${docDoctor.toUpperCase()}</text>
<text x="25" y="670" font-size="10" fill="#94A3B8">OFFICIAL ABDM ENCRYPTED CLINICAL RECORD · SECURE TRANSMISSION</text>
</svg>`;
          docImg = makeDocSvg(generatedSvg);
        }

        const newDoc = {
          id: 'doc_' + Date.now().toString(36),
          type: docData.type || 'Clinical Document',
          date: docData.date || new Date().toISOString().slice(0, 10),
          doctor: docData.doctor || 'Dr. Rajesh Sharma, MD',
          dx: docData.dx || '',
          labs: Array.isArray(docData.labs) ? docData.labs : [],
          meds: Array.isArray(docData.meds) ? docData.meds : [],
          verified: true,
          doc: docImg
        };

        patient.records.unshift(newDoc);

        return res.status(200).json({
          ok: true,
          message: 'Document successfully saved and attached to ABHA ID ' + patient.abhaNumber,
          document: newDoc,
          totalRecords: patient.records.length
        });
      }

      // Default: Status & Role directory
      default: {
        return res.status(200).json({
          ok: true,
          service: 'Medoryx Multi-Tenant Hospital & RBAC API',
          roles: ['super_admin', 'hospital_admin', 'doctor', 'lab_technician', 'pharmacist', 'receptionist', 'patient'],
          hospitalsCount: memoryStore.hospitals.length,
          activeEncounters: memoryStore.encounters.length,
          pendingLabOrders: memoryStore.labOrders.filter(l => l.status !== 'completed').length,
          pendingRxOrders: memoryStore.prescriptions.filter(p => p.dispenseStatus === 'pending').length,
          pendingAppointments: (memoryStore.appointments || []).filter(a => a.status === 'pending').length
        });
      }
    }
  } catch (err) {
    console.error('Error in /api/hospital:', err);
    return res.status(500).json({ error: err.message || 'Internal hospital service error', code: 'HOSP_ERROR' });
  }
};
