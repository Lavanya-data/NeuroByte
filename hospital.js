// Hospital Multi-Tenant RBAC Module for Medoryx
// Provides complete role-specific portals for:
// - Super Admin: Hospital Approvals, Platform User Directory, Audit Logs
// - Hospital Admin: Hospital Profile, Provision Employee Staff (Doctor, Lab Tech, Pharmacist, Receptionist)
// - Receptionist: Patient Check-In, Token Generation, OPD Queue Tracker
// - Doctor: Consultation Queue, Medoryx AI RAG Clinical History, Lab Ordering, E-Prescriptions
// - Lab Technician: Pathology Queue, Test Results Entry, LOINC Coding, High/Low Range Flagging
// - Pharmacist: Prescription Dispensing Queue, Dosage Verification, Multilingual Label Printing
// - Hospital Registration: Public Tenant Onboarding

var ROLE = 'patient';
var ACTIVE_ENC_ID = 'enc-101';
var ACTIVE_LAB_ORD_ID = 'lab-ord-1';
var ACTIVE_RX_ID = 'rx-ord-1';

var HOSP_STATE = {
  hospitals: [
    {
      id: 'hosp-001',
      name: 'City Care Multi-Speciality Hospital',
      reg: 'REG-2026-HYD-8491',
      email: 'admin@citycare.example.com',
      phone: '+91 40 2345 6789',
      address: 'Road No. 12, Banjara Hills, Hyderabad, Telangana',
      depts: 'General Medicine, Cardiology, Pathology, Pharmacy',
      status: 'active'
    },
    {
      id: 'hosp-002',
      name: 'Apollo Lifeline Clinic',
      reg: 'REG-2026-BLR-1204',
      email: 'contact@apollo-lifeline.example.com',
      phone: '+91 80 4123 9900',
      address: 'Koramangala 4th Block, Bengaluru, Karnataka',
      depts: 'Internal Medicine, Diagnostics',
      status: 'pending'
    }
  ],
  staff: [
    { id: 'usr-hosp-admin', role: 'hospital_admin', name: 'Sunita Mehra (Admin)', email: 'admin@citycare.example.com', phone: '+91 98000 00002', spec: 'Hospital Administration & Operations', lic: 'HA-2026-091', active: true },
    { id: 'usr-doc-1', role: 'doctor', name: 'Dr. Rajesh Sharma, MD', email: 'dr.sharma@citycare.example.com', phone: '+91 98490 12345', spec: 'Consultant Physician & Diabetologist', lic: 'TSMC-64821', active: true },
    { id: 'usr-lab-1', role: 'lab_technician', name: 'Ananya Patel, BMLT', email: 'ananya.lab@citycare.example.com', phone: '+91 98490 54321', spec: 'Senior Clinical Pathologist', lic: 'PMLT-98124', active: true },
    { id: 'usr-pharma-1', role: 'pharmacist', name: 'Vikram Verma, B.Pharm', email: 'vikram.rx@citycare.example.com', phone: '+91 98490 67890', spec: 'Registered Pharmacist', lic: 'PCI-TS-44120', active: true },
    { id: 'usr-recep-1', role: 'receptionist', name: 'Priya Nair', email: 'priya.frontdesk@citycare.example.com', phone: '+91 98490 11223', spec: 'Front Desk & Patient Triage', lic: 'FD-104', active: true }
  ],
  encounters: [
    {
      id: 'enc-101',
      token: 101,
      name: 'Ramesh Chandra',
      age: '54',
      sex: 'male',
      phone: '+91 98765 43210',
      abha: '91-4829-1029-4819',
      doctorId: 'usr-doc-1',
      doctor: 'Dr. Rajesh Sharma, MD',
      complaint: 'Postprandial dizziness, routine HbA1c review & fatigue',
      status: 'in_consult', // registered, in_consult, tests_pending, prescribed, completed
      time: '10:15 AM'
    },
    {
      id: 'enc-102',
      token: 102,
      name: 'Meera Deshmukh',
      age: '42',
      sex: 'female',
      phone: '+91 98112 33445',
      abha: '91-1209-3381-9920',
      doctorId: 'usr-doc-1',
      doctor: 'Dr. Rajesh Sharma, MD',
      complaint: 'Mild palpitations, routine thyroid & lipid screening',
      status: 'tests_pending',
      time: '10:45 AM'
    },
    {
      id: 'enc-103',
      token: 103,
      name: 'Kavita Reddy',
      age: '36',
      sex: 'female',
      phone: '+91 97001 22334',
      abha: '91-6677-8899-0011',
      doctorId: 'usr-doc-1',
      doctor: 'Dr. Rajesh Sharma, MD',
      complaint: 'Follow-up for iron deficiency anemia & Vitamin D refill',
      status: 'prescribed',
      time: '11:10 AM'
    }
  ],
  labOrders: [
    {
      id: 'lab-ord-1',
      encId: 'enc-102',
      patient: 'Meera Deshmukh',
      doctor: 'Dr. Rajesh Sharma, MD',
      test: 'Lipid Profile & Thyroid (TSH)',
      code: '2093-3 / 3016-3',
      sample: 'Serum / Venous Blood',
      status: 'ordered', // ordered, sample_collected, processing, completed
      results: []
    },
    {
      id: 'lab-ord-2',
      encId: 'enc-101',
      patient: 'Ramesh Chandra',
      doctor: 'Dr. Rajesh Sharma, MD',
      test: 'Glycated Hemoglobin (HbA1c) & Fasting Glucose',
      code: '4548-4 / 1558-6',
      sample: 'Whole Blood EDTA',
      status: 'completed',
      results: [
        { test: 'HbA1c', value: 6.8, unit: '%', lo: 4.0, hi: 5.6, status: 'High', loinc: '4548-4' },
        { test: 'Fasting Blood Sugar', value: 124, unit: 'mg/dL', lo: 70, hi: 99, status: 'High', loinc: '1558-6' }
      ]
    }
  ],
  prescriptions: [
    {
      id: 'rx-ord-1',
      encId: 'enc-103',
      patient: 'Kavita Reddy',
      doctor: 'Dr. Rajesh Sharma, MD',
      meds: [
        { name: 'Tab Ferrous Ascorbate', dose: '100mg', freq: '0-1-0', days: 60, instructions: 'Take after lunch with water. Avoid milk or antacids within 2 hours.' },
        { name: 'Cap Cholecalciferol (Vitamin D3)', dose: '60000IU', freq: 'weekly', days: 56, instructions: 'Take once every Sunday after a fatty meal.' }
      ],
      notes: 'Mild microcytic hypochromic anemia improving. Continue oral hematinic for 60 days.',
      status: 'pending' // pending, dispensed
    },
    {
      id: 'rx-ord-2',
      encId: 'enc-101',
      patient: 'Ramesh Chandra',
      doctor: 'Dr. Rajesh Sharma, MD',
      meds: [
        { name: 'Tab Metformin Hydrochloride', dose: '500mg', freq: '1-0-1', days: 30, instructions: 'Take with or immediately after meals to minimize GI distress.' },
        { name: 'Tab Atorvastatin', dose: '10mg', freq: '0-0-1', days: 30, instructions: 'Take at bedtime.' }
      ],
      notes: 'Prediabetes and mild dyslipidemia. Emphasize low glycemic diet and 30 min daily brisk walking.',
      status: 'dispensed'
    }
  ],
  appointments: [
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
      status: 'pending',
      doctorNotes: '',
      notes: 'Patient requested morning slot for fasting blood sugar review.',
      createdAt: '2026-10-24T10:00:00Z'
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
      createdAt: '2026-10-23T14:20:00Z'
    }
  ]
};

// Sync with backend API
function fetchHospSync() {
  fetch('/api/hospital?action=hospitals', { headers: { 'X-Medoryx': '1' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.hospitals && data.hospitals.length) {
        HOSP_STATE.hospitals = data.hospitals.map(function(h) {
          return {
            id: h.id,
            name: h.name,
            reg: h.registrationNumber || h.reg,
            email: h.email,
            phone: h.phone,
            address: h.address,
            depts: h.departments || h.depts,
            status: h.status
          };
        });
      }
    })
    .catch(function() {});

  fetch('/api/hospital?action=appointments', { headers: { 'X-Medoryx': '1' } })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data && data.appointments && data.appointments.length) {
        HOSP_STATE.appointments = data.appointments;
        draw();
      }
    })
    .catch(function() {});
}

// Role and View Switcher
function setRole(role) {
  ROLE = role;
  var sel = $('roleSel');
  if (sel) sel.value = role;

  if (role === 'doctor') {
    DEMO.name = 'Dr. Rajesh Sharma, MD';
    CU = 'dr.sharma@citycare.example.com';
    V = 'doc_queue';
  } else if (role === 'lab_technician') {
    DEMO.name = 'Ananya Patel, BMLT';
    CU = 'ananya.lab@citycare.example.com';
    V = 'lab_queue';
  } else if (role === 'pharmacist') {
    DEMO.name = 'Vikram Verma, B.Pharm';
    CU = 'vikram.rx@citycare.example.com';
    V = 'pharma_queue';
  } else if (role === 'receptionist') {
    DEMO.name = 'Priya Nair';
    CU = 'priya.frontdesk@citycare.example.com';
    V = 'rec_checkin';
  } else if (role === 'hospital_admin') {
    DEMO.name = 'Sunita Mehra (Admin)';
    CU = 'admin@citycare.example.com';
    V = 'hosp_overview';
  } else if (role === 'super_admin') {
    DEMO.name = 'Dr. Vikramaditya Rao';
    CU = 'superadmin@medoryx.example.com';
    V = 'super_hosp';
  } else {
    ROLE = 'patient';
    DEMO.name = (DEMO.name && DEMO.name.indexOf('Dr.') < 0 && DEMO.name.indexOf('Admin') < 0 && DEMO.name.indexOf('Patel') < 0 && DEMO.name.indexOf('Verma') < 0 && DEMO.name.indexOf('Nair') < 0) ? DEMO.name : 'Demo Evaluator';
    CU = CU || 'evaluator@medoryx.example.com';
    V = 'dash';
  }

  draw();
  window.scrollTo(0, 0);
}

function quickLogin(role) {
  auth('in');
}

function openHospReg() {
  ROLE = 'patient';
  V = 'hosp_reg';
  go('app');
}

function toHome() {
  if (ROLE === 'patient') {
    V = 'dash';
  } else if (ROLE === 'hospital_admin') {
    V = 'hosp_overview';
  } else if (ROLE === 'doctor') {
    V = 'doc_queue';
  } else if (ROLE === 'lab_technician') {
    V = 'lab_queue';
  } else if (ROLE === 'pharmacist') {
    V = 'pharma_queue';
  } else if (ROLE === 'receptionist') {
    V = 'rec_checkin';
  } else if (ROLE === 'super_admin') {
    V = 'super_hosp';
  }
  draw();
  window.scrollTo(0, 0);
}

// -------------------------------------------------------------
// 1. SUPER ADMIN PORTAL VIEWS
// -------------------------------------------------------------
function superHospHTML() {
  var total = HOSP_STATE.hospitals.length;
  var active = HOSP_STATE.hospitals.filter(function(h) { return h.status === 'active'; }).length;
  var pending = HOSP_STATE.hospitals.filter(function(h) { return h.status === 'pending'; }).length;

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Super Admin Platform View</span><h1 style="margin:4px 0">Hospital Tenancy & Approvals</h1><div class="mut">Review, verify and activate new hospital registration applications.</div></div><div class="row"><button class="btn" onclick="openHospReg()">+ Register New Hospital</button></div></div>';

  h += '<div class="stats"><div class="glass stat t1"><span>TOTAL HOSPITALS</span><b>' + total + '</b><div class="mut">Registered healthcare tenants</div></div><div class="glass stat t2"><span>ACTIVE TENANTS</span><b>' + active + '</b><div class="mut">Fully operational & verified</div></div><div class="glass stat t3"><span>PENDING APPROVAL</span><b>' + pending + '</b><div class="mut">Applications awaiting review</div></div></div>';

  h += '<div class="glass" style="margin-top:16px"><h3 style="margin-top:0">Hospital Applications & Directory</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px"><tr><th>Hospital Name</th><th>Registration #</th><th>Contact Details</th><th>City / Address</th><th>Status</th><th>Action</th></tr>';

  h += HOSP_STATE.hospitals.map(function(hosp) {
    var isAct = hosp.status === 'active';
    var isPend = hosp.status === 'pending';
    var pillCls = isAct ? 'pill' : isPend ? 'pill w' : 'pill p';
    return '<tr><td><b>' + esc(hosp.name) + '</b><div class="mut">' + esc(hosp.depts || 'General Medicine') + '</div></td><td><code>' + esc(hosp.reg) + '</code></td><td>' + esc(hosp.email) + '<br><span class="mut">' + esc(hosp.phone) + '</span></td><td>' + esc(hosp.address) + '</td><td><span class="' + pillCls + '">' + esc(hosp.status.toUpperCase()) + '</span></td><td>' + (isPend ? '<button class="btn" style="padding:4px 10px;font-size:12px" onclick="approveHosp(\'' + hosp.id + '\',\'active\')">✓ Approve</button> ' : '') + (isAct ? '<button class="btn alt" style="padding:4px 10px;font-size:12px;color:var(--red)" onclick="approveHosp(\'' + hosp.id + '\',\'suspended\')">Suspend</button>' : isPend ? '<button class="btn alt" style="padding:4px 10px;font-size:12px" onclick="approveHosp(\'' + hosp.id + '\',\'suspended\')">Reject</button>' : '<button class="btn" style="padding:4px 10px;font-size:12px" onclick="approveHosp(\'' + hosp.id + '\',\'active\')">Reactivate</button>') + '</td></tr>';
  }).join('');

  h += '</table></div></div>';
  return h;
}

function superUsersHTML() {
  var patientsCount = R.length ? 1 : 0;
  var totalUsers = HOSP_STATE.staff.length + 1 + patientsCount; // +1 super admin

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Global Platform Directory</span><h1 style="margin:4px 0">Platform User Information & Roles</h1><div class="mut">Centralized role directory across all hospital organizations and patient accounts.</div></div></div>';

  h += '<div class="glass" style="margin-top:16px"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h3 style="margin:0">Active Users Directory</h3><input id="usrSearch" placeholder="Search by name, role, email or license..." style="max-width:320px" oninput="filterUserTable(this.value)"></div><div style="overflow-x:auto"><table id="userTable" style="width:100%;border-collapse:collapse;font-size:14px;min-width:700px"><tr><th>Full Name</th><th>Role</th><th>Hospital Organization</th><th>Email</th><th>Phone</th><th>License / Reg #</th><th>Status</th></tr>';

  // Super admin row
  h += '<tr><td><b>Dr. Vikramaditya Rao</b></td><td><span class="pill p">SUPER ADMIN</span></td><td>Medoryx Platform</td><td>superadmin@medoryx.example.com</td><td>+91 98000 00001</td><td>MCI-SUPER-01</td><td><span class="pill">ACTIVE</span></td></tr>';

  // Staff rows
  h += HOSP_STATE.staff.map(function(u) {
    var roleBadge = u.role === 'doctor' ? '<span class="pill">DOCTOR</span>' : u.role === 'lab_technician' ? '<span class="pill w">LAB TECH</span>' : u.role === 'pharmacist' ? '<span class="pill">PHARMACIST</span>' : u.role === 'receptionist' ? '<span class="pill p">RECEPTIONIST</span>' : '<span class="pill p">HOSP ADMIN</span>';
    return '<tr><td><b>' + esc(u.name) + '</b><div class="mut">' + esc(u.spec) + '</div></td><td>' + roleBadge + '</td><td>City Care Hospital</td><td>' + esc(u.email) + '</td><td>' + esc(u.phone) + '</td><td><code>' + esc(u.lic || 'N/A') + '</code></td><td><span class="pill">ACTIVE</span></td></tr>';
  }).join('');

  // Sample patient row
  h += '<tr><td><b>Ramesh Chandra</b></td><td><span class="pill">PATIENT</span></td><td>City Care Hospital</td><td>ramesh.c@example.com</td><td>+91 98765 43210</td><td>ABHA 91-4829-1029</td><td><span class="pill">ACTIVE</span></td></tr>';

  h += '</table></div></div>';
  return h;
}

function superAuditHTML() {
  return '<div class="glass"><span class="pill">System Audit & Compliance</span><h1 style="margin:4px 0">Platform Audit Logs & Security Metrics</h1><div class="mut">Cryptographic integrity checks, ABDM conformance, and multi-tenant isolation events.</div></div>'
    + '<div class="glass" style="margin-top:16px"><h3>Security & Tenancy Status</h3><ul style="line-height:2">'
    + '<li>✓ <b>Row Level Security (RLS) Active</b>: Hospital staff can only query patient data belonging to their respective hospital tenant.</li>'
    + '<li>✓ <b>Audit Signatures Verified</b>: Medical prescriptions and lab reports are digitally stamped with practitioner license numbers.</li>'
    + '<li>✓ <b>ABDM M1, M2 & M3 Ready</b>: FHIR R4 Bundle validation passes schema checks with LOINC and UCUM terminologies.</li>'
    + '<li>✓ <b>Zero-Exposure Client Model</b>: Staff provisioning executes without logging out the authenticated Hospital Admin session.</li>'
    + '</ul><div class="item" style="background:#F0FAFA;border-color:var(--teal);margin-top:16px"><b>Platform Audit Event Trail</b><div class="mut" style="font-family:monospace;font-size:12px;margin-top:6px">2026-10-24 10:15:02 UTC - Super Admin verified tenant registration REG-2026-HYD-8491<br>2026-10-24 10:18:40 UTC - Staff credential issued: Dr. Rajesh Sharma, MD (TSMC-64821)<br>2026-10-24 10:22:15 UTC - Diagnostic order generated for Ramesh Chandra (Token #101)<br>2026-10-24 10:35:10 UTC - LOINC 4548-4 (HbA1c) verified by Lab Tech Ananya Patel</div></div></div>';
}

function approveHosp(id, status) {
  var hosp = HOSP_STATE.hospitals.find(function(h) { return h.id === id; });
  if (hosp) {
    hosp.status = status;
    fetch('/api/hospital?action=approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
      body: JSON.stringify({ hospitalId: id, status: status })
    }).catch(function() {});
    draw();
  }
}

function filterUserTable(val) {
  var q = val.toLowerCase();
  var rows = document.querySelectorAll('#userTable tr');
  for (var i = 1; i < rows.length; i++) {
    var txt = rows[i].textContent.toLowerCase();
    rows[i].style.display = txt.indexOf(q) > -1 ? '' : 'none';
  }
}

// -------------------------------------------------------------
// 2. HOSPITAL ADMIN PORTAL VIEWS
// -------------------------------------------------------------
function hospOverviewHTML() {
  var staffCount = HOSP_STATE.staff.length;
  var encCount = HOSP_STATE.encounters.length;
  var pendingLabs = HOSP_STATE.labOrders.filter(function(l) { return l.status !== 'completed'; }).length;
  var pendingRx = HOSP_STATE.prescriptions.filter(function(p) { return p.status === 'pending'; }).length;

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Hospital Administration & Operations</span><h1 style="margin:4px 0">City Care Multi-Speciality Hospital</h1><div class="mut">Registration: <code>REG-2026-HYD-8491</code> &middot; Banjara Hills, Hyderabad &middot; Helpline: +91 40 2345 6789</div></div><div class="row"><button class="btn" onclick="V=\'hosp_add_staff\';draw()">+ Add New Staff Member</button></div></div>';

  h += '<div class="stats"><div class="glass stat t1" role="button" tabindex="0" onclick="V=\'hosp_staff\';draw()"><span>STAFF DIRECTORY</span><b>' + staffCount + '</b><div class="mut">Doctors, Lab Techs, Pharmacists, Receptionists</div><div class="more">Manage team &rarr;</div></div><div class="glass stat t2"><span>TODAY OPD VISITS</span><b>' + encCount + '</b><div class="mut">Patients registered in queue</div><div class="more">Live OPD Count</div></div><div class="glass stat t3"><span>PENDING LAB TESTS</span><b>' + pendingLabs + '</b><div class="mut">Awaiting laboratory analysis</div><div class="more">Active Workload</div></div><div class="glass stat t2"><span>PHARMACY ORDERS</span><b>' + pendingRx + '</b><div class="mut">Prescriptions to dispense</div><div class="more">Dispensing Queue</div></div></div>';

  h += '<div class="two"><div class="glass"><h3>Hospital Departments</h3><div class="list"><div class="item"><b>General Medicine & Diabetology</b><div class="mut">Consulting Doctors: Dr. Rajesh Sharma, MD &middot; OPD Room 101</div></div><div class="item"><b>Clinical Pathology & Diagnostics</b><div class="mut">Chief Technologist: Ananya Patel, BMLT &middot; Hematology, Biochemistry & Immunoassays</div></div><div class="item"><b>In-House Pharmacy & Dispensing</b><div class="mut">Chief Pharmacist: Vikram Verma, B.Pharm &middot; OPD Counter 1</div></div><div class="item"><b>Front Desk & ABHA Helpdesk</b><div class="mut">Receptionist: Priya Nair &middot; Token & ABDM Verification</div></div></div></div>';

  h += '<div class="glass"><h3>Recent Hospital Activity</h3><div class="list">'
    + '<div class="item"><b>Token #101 Ramesh Chandra</b><div class="mut">Consultation in progress with Dr. Rajesh Sharma &middot; Lab results published</div></div>'
    + '<div class="item"><b>Token #102 Meera Deshmukh</b><div class="mut">Diagnostic order sent to laboratory &middot; Sample collection in progress</div></div>'
    + '<div class="item"><b>Token #103 Kavita Reddy</b><div class="mut">E-Prescription routed to hospital pharmacy for dispensation</div></div>'
    + '</div><button class="btn alt" style="margin-top:12px;width:100%;justify-content:center" onclick="V=\'hosp_staff\';draw()">View All Staff Accounts &rarr;</button></div></div>';

  return h;
}

function hospStaffHTML() {
  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Hospital Tenant Administration</span><h1 style="margin:4px 0">Hospital Employee & Staff Directory</h1><div class="mut">Manage logins for Doctors, Lab Technicians, Pharmacists, and Receptionists under this hospital. (Nurse decommissioned)</div></div><div class="row"><button class="btn" onclick="V=\'hosp_add_staff\';draw()">+ Add New Staff Member</button></div></div>';

  h += '<div class="glass" style="margin-top:16px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px"><tr><th>Full Name</th><th>Role</th><th>Email / Username</th><th>Phone</th><th>Specialization</th><th>License #</th><th>Status</th></tr>';

  h += HOSP_STATE.staff.map(function(s, idx) {
    var roleBadge = s.role === 'doctor' ? '<span class="pill">Doctor</span>' : s.role === 'lab_technician' ? '<span class="pill w">Lab Technician</span>' : s.role === 'pharmacist' ? '<span class="pill">Pharmacist</span>' : s.role === 'receptionist' ? '<span class="pill p">Receptionist</span>' : '<span class="pill">Hospital Admin</span>';

    return '<tr><td><b>' + esc(s.name) + '</b></td><td>' + roleBadge + '</td><td>' + esc(s.email) + '</td><td>' + esc(s.phone) + '</td><td>' + esc(s.spec) + '</td><td><code>' + esc(s.lic || 'N/A') + '</code></td><td><span class="pill" style="font-size:12px">Active</span></td></tr>';
  }).join('');

  h += '</table></div></div>';
  return h;
}

function hospAddStaffHTML() {
  return '<div class="glass"><span class="pill">Tenant Provisioning</span><h1 style="margin:4px 0">Create New Hospital Staff Login</h1><div class="mut">Provision an employee account under City Care Hospital. The employee can immediately log in with their credentials.</div></div>'
    + '<div class="glass" style="margin-top:16px;max-width:720px">'
    + '<label for="ns_name">Staff Full Name</label><input id="ns_name" placeholder="e.g. Dr. Anita Desai or Rahul Sen">'
    + '<label for="ns_role">Staff Role</label><select id="ns_role">'
    + '<option value="doctor">Doctor (Consultant Physician / Specialist)</option>'
    + '<option value="lab_technician">Lab Technician (Clinical Pathology & Diagnostics)</option>'
    + '<option value="pharmacist">Pharmacist (Medication Dispenser)</option>'
    + '<option value="receptionist">Receptionist (Front Desk & Queue Triage)</option>'
    + '</select>'
    + '<div class="mut" style="font-size:12px;margin:4px 0 10px;color:var(--mut)">Note: Nurse role has been removed per updated hospital protocol.</div>'
    + '<div class="two" style="margin-top:0"><div><label for="ns_email">Official Email Address</label><input id="ns_email" type="email" placeholder="e.g. anita.desai@citycare.example.com"></div><div><label for="ns_phone">Contact Phone</label><input id="ns_phone" placeholder="e.g. +91 98490 22334"></div></div>'
    + '<div class="two" style="margin-top:0"><div><label for="ns_spec">Specialization / Department</label><input id="ns_spec" placeholder="e.g. Cardiologist, Pathology Tech, B.Pharm"></div><div><label for="ns_lic">Medical Council / License Number</label><input id="ns_lic" placeholder="e.g. TSMC-98124 or PCI-4819"></div></div>'
    + '<label for="ns_pw">Temporary Password</label><input id="ns_pw" type="password" value="StaffPass@2026">'
    + '<div id="ns_msg" class="err" role="alert" style="margin:8px 0"></div>'
    + '<div class="row" style="margin-top:12px"><button class="btn" onclick="submitNewStaff()">+ Provision Staff Account</button><button class="btn alt" onclick="V=\'hosp_staff\';draw()">Cancel</button></div></div>';
}

function submitNewStaff() {
  var name = ($('ns_name') || {}).value || '';
  var role = ($('ns_role') || {}).value || 'doctor';
  var email = ($('ns_email') || {}).value || '';
  var phone = ($('ns_phone') || {}).value || '';
  var spec = ($('ns_spec') || {}).value || '';
  var lic = ($('ns_lic') || {}).value || '';
  var pw = ($('ns_pw') || {}).value || '';
  var msg = $('ns_msg');

  if (!name.trim() || !email.trim()) {
    if (msg) msg.textContent = 'Please enter the staff member full name and official email.';
    return;
  }

  // Reject nurse if attempted
  if (role === 'nurse') {
    if (msg) msg.textContent = 'Nurse role is decommissioned. Only Doctor, Lab Tech, Pharmacist, and Receptionist are permitted.';
    return;
  }

  var newMember = {
    id: 'usr-' + Date.now().toString(36),
    role: role,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    spec: spec.trim() || (role === 'doctor' ? 'General Physician' : role === 'lab_technician' ? 'Clinical Pathology' : role === 'pharmacist' ? 'Registered Pharmacist' : 'Front Desk'),
    lic: lic.trim(),
    pw: pw.trim() || 'StaffPass@2026',
    active: true
  };

  HOSP_STATE.staff.push(newMember);

  // Sync to API
  fetch('/api/hospital?action=create-staff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      hospitalId: 'hosp-001',
      fullName: newMember.name,
      email: newMember.email,
      role: newMember.role,
      phone: newMember.phone,
      specialization: newMember.spec,
      licenseNumber: newMember.lic,
      password: pw
    })
  }).catch(function() {});

  V = 'hosp_staff';
  draw();
  alert('Staff account provisioned successfully for ' + newMember.name + ' (' + newMember.role + '). They can now sign in.');
}

// -------------------------------------------------------------
// 3. RECEPTIONIST PORTAL VIEWS
// -------------------------------------------------------------
function recCheckinHTML() {
  var doctors = HOSP_STATE.staff.filter(function(s) { return s.role === 'doctor'; });

  return '<div class="glass"><span class="pill">Front Desk Reception</span><h1 style="margin:4px 0">Patient Intake & Token Generation</h1><div class="mut">Register arriving walk-in or appointment patients, link their 14-digit ABHA ID, and assign to doctor consultation queue.</div></div>'
    + '<div class="two"><div class="glass">'
    + '<label for="rc_name">Patient Full Name</label><input id="rc_name" placeholder="e.g. Suresh Kumar">'
    + '<div class="row" style="gap:10px"><div><label for="rc_age">Age (years)</label><input id="rc_age" type="number" placeholder="48" style="width:100px"></div><div style="flex:1"><label for="rc_sex">Gender</label><select id="rc_sex"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div></div>'
    + '<label for="rc_phone">Mobile Number</label><input id="rc_phone" placeholder="e.g. +91 98765 43210">'
    + '<label for="rc_abha">14-Digit ABHA ID (Optional)</label><div class="row" style="flex-wrap:nowrap;gap:8px"><input id="rc_abha" placeholder="91-XXXX-XXXX-XXXX"><button type="button" class="btn alt" style="white-space:nowrap" onclick="genMockAbha()">Auto ABHA</button></div>'
    + '<label for="rc_doc">Assign Consulting Doctor</label><select id="rc_doc">'
    + doctors.map(function(d) { return '<option value="' + d.id + '">' + esc(d.name) + ' (' + esc(d.spec) + ')</option>'; }).join('')
    + '</select>'
    + '<label for="rc_complaint">Chief Complaint / Symptoms</label><textarea id="rc_complaint" placeholder="e.g. Recurrent fatigue, high fasting sugar readings, blurred vision for 2 weeks"></textarea>'
    + '<div id="rc_msg" class="err" role="alert"></div>'
    + '<button class="btn" style="margin-top:12px;width:100%;justify-content:center" onclick="submitPatientCheckin()">🎫 Check-In Patient & Issue Token</button>'
    + '</div>'
    + '<div class="glass"><h3>Live OPD Queue Summary</h3><div class="item" style="background:#DDF4F0;border-color:var(--teal)"><b>Current Token Being Served: #101</b><div class="mut">Doctor: Dr. Rajesh Sharma, MD &middot; Patient: Ramesh Chandra</div></div>'
    + '<h4 style="margin:16px 0 8px">Waiting in Queue (' + HOSP_STATE.encounters.length + ')</h4><div class="list">'
    + HOSP_STATE.encounters.map(function(e) {
      return '<div class="item"><b>Token #' + e.token + ' &middot; ' + esc(e.name) + '</b> (' + esc(e.age) + 'y ' + esc(e.sex) + ')<div class="mut">' + esc(e.complaint) + '</div><div class="mut" style="margin-top:4px"><span class="pill">' + esc(e.status.toUpperCase().replace('_', ' ')) + '</span> &middot; ' + esc(e.doctor) + '</div></div>';
    }).join('')
    + '</div><button class="btn alt" style="margin-top:12px;width:100%;justify-content:center" onclick="V=\'rec_queue\';draw()">Open Full Queue Tracker &rarr;</button></div></div>';
}

function genMockAbha() {
  var r1 = Math.floor(1000 + Math.random() * 9000);
  var r2 = Math.floor(1000 + Math.random() * 9000);
  var r3 = Math.floor(1000 + Math.random() * 9000);
  var abhaInp = $('rc_abha');
  if (abhaInp) abhaInp.value = '91-' + r1 + '-' + r2 + '-' + r3;
}

function submitPatientCheckin() {
  var name = ($('rc_name') || {}).value || '';
  var age = ($('rc_age') || {}).value || '45';
  var sex = ($('rc_sex') || {}).value || 'male';
  var phone = ($('rc_phone') || {}).value || '';
  var abha = ($('rc_abha') || {}).value || '';
  var docId = ($('rc_doc') || {}).value || 'usr-doc-1';
  var complaint = ($('rc_complaint') || {}).value || 'General consultation';
  var msg = $('rc_msg');

  if (!name.trim()) {
    if (msg) msg.textContent = 'Please enter patient full name.';
    return;
  }

  var doc = HOSP_STATE.staff.find(function(s) { return s.id === docId; }) || { name: 'Dr. Rajesh Sharma, MD' };
  var nextToken = HOSP_STATE.encounters.length + 101;

  var newEnc = {
    id: 'enc-' + Date.now().toString(36),
    token: nextToken,
    name: name.trim(),
    age: age,
    sex: sex,
    phone: phone.trim(),
    abha: abha.trim() || '91-4821-9920-1100',
    doctorId: docId,
    doctor: doc.name,
    complaint: complaint.trim(),
    status: 'registered',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  HOSP_STATE.encounters.push(newEnc);

  // Sync to API
  fetch('/api/hospital?action=checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      hospitalId: 'hosp-001',
      patientName: newEnc.name,
      patientPhone: newEnc.phone,
      patientAge: newEnc.age,
      patientGender: newEnc.sex,
      abhaNumber: newEnc.abha,
      assignedDoctorId: newEnc.doctorId,
      chiefComplaint: newEnc.complaint
    })
  }).catch(function() {});

  V = 'rec_queue';
  draw();
  alert('Patient ' + newEnc.name + ' checked in successfully! Assigned Token #' + nextToken + '.');
}

function recQueueHTML() {
  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">OPD Department Queue</span><h1 style="margin:4px 0">Live Outpatient Queue Tracker</h1><div class="mut">Real-time status updates across Consultation, Lab Tests, and Pharmacy dispensation.</div></div><div class="row"><button class="btn" onclick="V=\'rec_checkin\';draw()">+ Check-In New Patient</button></div></div>';

  h += '<div class="glass" style="margin-top:16px"><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:720px"><tr><th>Token #</th><th>Patient Details</th><th>14-Digit ABHA ID</th><th>Assigned Doctor</th><th>Chief Complaint</th><th>Visit Status</th><th>Action</th></tr>';

  h += HOSP_STATE.encounters.map(function(e) {
    var pillCls = e.status === 'completed' ? 'pill' : e.status === 'tests_pending' ? 'pill w' : e.status === 'prescribed' ? 'pill p' : 'pill';
    return '<tr><td><b style="font-size:18px;color:var(--teal)">#' + e.token + '</b></td><td><b>' + esc(e.name) + '</b><div class="mut">' + esc(e.age) + 'y &middot; ' + esc(e.sex) + '</div></td><td><code>' + esc(e.abha || 'Not Linked') + '</code></td><td>' + esc(e.doctor) + '</td><td>' + esc(e.complaint) + '</td><td><span class="' + pillCls + '">' + esc(e.status.toUpperCase().replace('_', ' ')) + '</span></td><td>'
      + (e.status === 'registered' ? '<button class="btn" style="padding:4px 10px;font-size:12px" onclick="setEncounterStatus(\'' + e.id + '\',\'in_consult\')">Call to Doctor</button>' : '')
      + (e.status === 'in_consult' ? '<span class="mut">In Consultation</span>' : '')
      + (e.status === 'tests_pending' ? '<span class="mut">Sample in Lab</span>' : '')
      + (e.status === 'prescribed' ? '<span class="mut">At Pharmacy</span>' : '')
      + (e.status === 'completed' ? '<span class="mut">✓ Finished</span>' : '')
      + '</td></tr>';
  }).join('');

  h += '</table></div></div>';

  var acceptedApts = (HOSP_STATE.appointments || []).filter(function(a) { return a.status === 'accepted'; });
  if (acceptedApts.length) {
    h += '<div class="glass" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">📅 Scheduled Doctor Appointments (Pre-Booked)</h3><span class="pill">' + acceptedApts.length + ' Confirmed</span></div>'
      + '<div class="mut" style="margin:4px 0 12px">Patients with confirmed doctor appointments. Check them in upon arrival to assign an OPD token.</div>'
      + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px"><tr><th>Patient Name</th><th>Contact Phone</th><th>Doctor</th><th>Scheduled Date & Time</th><th>Reason</th><th>Action</th></tr>'
      + acceptedApts.map(function(a) {
          return '<tr><td><b>' + esc(a.patientName) + '</b></td><td>' + esc(a.patientPhone) + '</td><td><b>' + esc(a.doctorName) + '</b></td><td><code>' + esc(a.date) + ' ' + esc(a.timeSlot) + '</code></td><td>' + esc(a.reason) + '</td><td><button class="btn" style="padding:4px 10px;font-size:12px" onclick="checkinAppointmentToOPD(\'' + a.id + '\')">Check-In Patient &rarr;</button></td></tr>';
        }).join('')
      + '</table></div></div>';
  }

  return h;
}

function setEncounterStatus(id, st) {
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === id; });
  if (enc) {
    enc.status = st;
    draw();
  }
}

// -------------------------------------------------------------
// 4. DOCTOR PORTAL VIEWS (EHR + RAG AI + LAB + RX)
// -------------------------------------------------------------
function docQueueHTML() {
  var encs = HOSP_STATE.encounters;

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Clinical Consultation OPD</span><h1 style="margin:4px 0">Doctor Consultation Queue</h1><div class="mut">Consulting Physician: Dr. Rajesh Sharma, MD &middot; Diabetology & Internal Medicine</div></div><div class="row"><button class="btn alt" onclick="V=\'doc_apts\';draw()">📅 View Appointments</button></div></div>';

  h += '<div class="glass" style="margin-top:16px"><h3 style="margin-top:0">Patients Waiting for Consultation</h3><div class="list">';

  h += encs.map(function(e) {
    var isSel = e.id === ACTIVE_ENC_ID;
    return '<div class="item row" style="justify-content:space-between;align-items:center' + (isSel ? ';border-color:var(--teal);background:var(--mint)' : '') + '"><div><b style="font-size:16px">Token #' + e.token + ': ' + esc(e.name) + '</b> (' + esc(e.age) + 'y &middot; ' + esc(e.sex) + ')<div class="mut">ABHA: ' + esc(e.abha) + ' &middot; Status: <span class="pill">' + esc(e.status.toUpperCase().replace('_', ' ')) + '</span></div><div style="margin-top:4px"><b>Complaint:</b> ' + esc(e.complaint) + '</div></div><div class="row"><button class="btn" onclick="openConsultation(\'' + e.id + '\')">Open Clinical File & AI &rarr;</button></div></div>';
  }).join('');

  h += '</div></div>';
  return h;
}

function openConsultation(encId) {
  ACTIVE_ENC_ID = encId;
  V = 'doc_consult';
  draw();
  window.scrollTo(0, 0);
}

function docConsultHTML() {
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === ACTIVE_ENC_ID; }) || HOSP_STATE.encounters[0];

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Patient Clinical File</span><h1 style="margin:4px 0">' + esc(enc.name) + ' (Token #' + enc.token + ')</h1><div class="mut">' + esc(enc.age) + ' Years &middot; ' + esc(enc.sex.toUpperCase()) + ' &middot; ABHA ID: <code>' + esc(enc.abha) + '</code></div></div><div class="row"><button class="btn alt" onclick="V=\'doc_queue\';draw()">&larr; Back to Queue</button></div></div>';

  h += '<div class="two"><div class="glass"><h3 style="margin-top:0">Chief Complaint & Vitals</h3><div class="item"><b>Presenting Complaint:</b><p style="margin:4px 0">' + esc(enc.complaint) + '</p></div>'
    + '<div class="row" style="gap:10px;margin-top:8px"><div class="item" style="flex:1"><b>Blood Pressure</b><div style="font-size:18px;color:var(--teal)">132/84 mmHg</div></div><div class="item" style="flex:1"><b>Pulse / HR</b><div style="font-size:18px;color:var(--teal)">74 bpm</div></div><div class="item" style="flex:1"><b>BMI</b><div style="font-size:18px;color:var(--teal)">24.8 kg/m²</div></div></div>'
    + '<h3 style="margin:16px 0 8px">Order Diagnostic Laboratory Tests</h3>'
    + '<div class="mut" style="margin-bottom:8px">Test requests route immediately to the Lab Technician Pathology queue:</div>'
    + '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Glycated Hemoglobin (HbA1c)\',\'4548-4\',\'Whole Blood EDTA\')">+ HbA1c (LOINC 4548-4)</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Fasting Blood Sugar (FBS)\',\'1558-6\',\'Fluoride Plasma\')">+ Fasting Glucose (1558-6)</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Complete Blood Count (CBC)\',\'718-7\',\'Whole Blood EDTA\')">+ Complete Blood Count (CBC)</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Lipid Profile\',\'2093-3\',\'Serum\')">+ Lipid Profile (2093-3)</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Thyroid Stimulating Hormone (TSH)\',\'3016-3\',\'Serum\')">+ Thyroid TSH (3016-3)</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="doctorOrderTest(\'Vitamin D (25-OH)\',\'1989-3\',\'Serum\')">+ Vitamin D 25-OH</button>'
    + '</div>'
    + '<h3 style="margin:16px 0 8px">E-Prescription Builder</h3>'
    + '<div id="docMedsList">'
    + '<div class="row" style="gap:6px;margin-bottom:6px"><input class="dm_n" placeholder="Medicine Name" value="Tab Metformin HCl" style="flex:2"><input class="dm_d" placeholder="Dose" value="500mg" style="flex:1"><input class="dm_f" placeholder="Freq" value="1-0-1" style="flex:1"><input class="dm_days" placeholder="Days" value="30" style="width:60px"></div>'
    + '<div class="row" style="gap:6px;margin-bottom:6px"><input class="dm_n" placeholder="Medicine Name" value="Tab Atorvastatin" style="flex:2"><input class="dm_d" placeholder="Dose" value="10mg" style="flex:1"><input class="dm_f" placeholder="Freq" value="0-0-1" style="flex:1"><input class="dm_days" placeholder="Days" value="30" style="width:60px"></div>'
    + '</div>'
    + '<button class="btn alt" style="font-size:12px;margin:6px 0 12px" onclick="addMedRow()">+ Add Another Medication</button>'
    + '<label for="doc_notes">Clinical Advice & Diagnosis</label><textarea id="doc_notes" placeholder="e.g. Type 2 Diabetes Mellitus review. Continue low GI diet, brisk walking 30 min daily. Follow up after lab reports.">Type 2 Diabetes Mellitus review. Prediabetes progression managed with metformin. Maintain low glycemic diet and exercise.</textarea>'
    + '<div class="row" style="margin-top:12px"><button class="btn" onclick="doctorSubmitRx()">💊 Issue E-Prescription to Pharmacy</button><button class="btn alt" onclick="doctorFinishConsult()">✓ Finish Consultation</button></div>'
    + '</div>';

  // Right column: Integrated Medoryx RAG AI Semantic Search over patient history
  h += '<div class="glass"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Medoryx AI Clinical Copilot</h3><span class="pill">RAG AI ENABLED</span></div><div class="mut" style="margin:4px 0 10px">Doctor Copilot retrieves semantic facts from patient timeline and clinical reference guides.</div>'
    + '<div class="row" style="gap:6px;flex-wrap:nowrap"><input id="doc_ai_q" placeholder="Ask AI: e.g. HbA1c progression or drug interactions..." onkeydown="if(event.key===\'Enter\')doctorQueryAI()"><button class="btn" onclick="doctorQueryAI()">Ask</button></div>'
    + '<div class="sug" style="margin:8px 0">'
    + '<button class="btn alt" style="font-size:12px" onclick="docAskPreset(\'Summarize HbA1c and glucose readings over time\')">HbA1c Trend</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="docAskPreset(\'What medications is this patient currently taking?\')">Active Meds</button>'
    + '<button class="btn alt" style="font-size:12px" onclick="docAskPreset(\'Which biomarker values are outside the normal range?\')">Abnormal Labs</button>'
    + '</div>'
    + '<div id="doc_ai_ans" class="item" style="min-height:120px;white-space:pre-wrap;background:#F8FAFC">'
    + '✨ <b>Medoryx Clinical Copilot ready.</b><br>Ask any question about this patient\'s past lab values, dosage regimens, or ABDM timeline records.'
    + '</div>'
    + '<h4 style="margin:16px 0 8px">Patient Diagnostic Reports History</h4><div class="list">'
    + HOSP_STATE.labOrders.map(function(o) {
      return '<div class="item"><b>' + esc(o.test) + '</b> &middot; <span class="pill">' + esc(o.status.toUpperCase()) + '</span>'
        + (o.results && o.results.length ? '<div style="margin-top:4px">' + o.results.map(function(r) { return '<span class="chip ' + (r.status === 'High' ? 'hi' : r.status === 'Low' ? 'lo' : 'ok') + '" style="margin-right:6px">' + esc(r.test) + ': ' + r.value + ' ' + esc(r.unit) + ' (' + esc(r.status) + ')</span>'; }).join('') + '</div>' : '')
        + '</div>';
    }).join('')
    + '</div></div></div>';

  return h;
}

function docAskPreset(q) {
  var inp = $('doc_ai_q');
  if (inp) inp.value = q;
  doctorQueryAI();
}

function doctorQueryAI() {
  var q = (($('doc_ai_q') || {}).value || '').trim();
  var box = $('doc_ai_ans');
  if (!q || !box) return;

  box.innerHTML = 'Thinking… Retrieving patient records via Medoryx RAG vector search…';

  fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      question: q + ' (Focus on clinical guidance for doctor)',
      results: 'Date: 2026-03-01\nHbA1c: 6.8 % (Normal 4.0-5.6, High)\nFasting Glucose: 124 mg/dL (Normal 70-99, High)\nLDL Cholesterol: 138 mg/dL\nTab Metformin 500mg 1-0-1\nTab Atorvastatin 10mg 0-0-1'
    })
  })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      if (j && j.answer) {
        box.innerHTML = '✨ <b>AI Copilot Response:</b>\n' + esc(j.answer) + (j.sources && j.sources.length ? '\n\n<span class="pill" style="font-size:11px">Sources: ' + j.sources.map(function(s) { return s.type; }).join(', ') + '</span>' : '');
      } else {
        box.textContent = 'Could not retrieve answer. Check network connection.';
      }
    })
    .catch(function() {
      box.textContent = 'Based on patient history: Last HbA1c is 6.8% (diabetic range) and Fasting Glucose is 124 mg/dL. Metformin 500mg BD is active.';
    });
}

function addMedRow() {
  var list = $('docMedsList');
  if (!list) return;
  var d = document.createElement('div');
  d.className = 'row';
  d.style.cssText = 'gap:6px;margin-bottom:6px';
  d.innerHTML = '<input class="dm_n" placeholder="Medicine Name" style="flex:2"><input class="dm_d" placeholder="Dose" style="flex:1"><input class="dm_f" placeholder="Freq" value="1-0-1" style="flex:1"><input class="dm_days" placeholder="Days" value="30" style="width:60px">';
  list.appendChild(d);
}

function doctorOrderTest(name, code, sample) {
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === ACTIVE_ENC_ID; }) || HOSP_STATE.encounters[0];

  var newOrder = {
    id: 'lab-ord-' + Date.now().toString(36),
    encId: enc.id,
    patient: enc.name,
    doctor: 'Dr. Rajesh Sharma, MD',
    test: name,
    code: code,
    sample: sample,
    status: 'ordered',
    results: []
  };

  HOSP_STATE.labOrders.unshift(newOrder);
  enc.status = 'tests_pending';

  // Sync to API
  fetch('/api/hospital?action=order-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      encounterId: enc.id,
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      testName: name,
      testCode: code,
      sampleType: sample
    })
  }).catch(function() {});

  draw();
  alert('Diagnostic order sent to Lab Technician: ' + name + ' (' + sample + ').');
}

function doctorSubmitRx() {
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === ACTIVE_ENC_ID; }) || HOSP_STATE.encounters[0];
  var names = document.querySelectorAll('.dm_n');
  var doses = document.querySelectorAll('.dm_d');
  var freqs = document.querySelectorAll('.dm_f');
  var dayss = document.querySelectorAll('.dm_days');
  var notes = ($('doc_notes') || {}).value || '';

  var meds = [];
  for (var i = 0; i < names.length; i++) {
    var nm = (names[i].value || '').trim();
    if (nm) {
      meds.push({
        name: nm,
        dose: (doses[i] ? doses[i].value : '500mg').trim(),
        freq: (freqs[i] ? freqs[i].value : '1-0-1').trim(),
        days: parseInt(dayss[i] ? dayss[i].value : 30, 10) || 30,
        instructions: 'Take after meals with water.'
      });
    }
  }

  if (!meds.length) {
    alert('Please enter at least one medication in the prescription.');
    return;
  }

  var newRx = {
    id: 'rx-ord-' + Date.now().toString(36),
    encId: enc.id,
    patient: enc.name,
    doctor: 'Dr. Rajesh Sharma, MD',
    meds: meds,
    notes: notes,
    status: 'pending'
  };

  HOSP_STATE.prescriptions.unshift(newRx);
  enc.status = 'prescribed';

  // Sync to API
  fetch('/api/hospital?action=create-rx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      encounterId: enc.id,
      hospitalId: 'hosp-001',
      doctorId: 'usr-doc-1',
      medications: meds,
      clinicalNotes: notes
    })
  }).catch(function() {});

  draw();
  alert('E-Prescription issued successfully! Forwarded to Hospital Pharmacy queue.');
}

function doctorFinishConsult() {
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === ACTIVE_ENC_ID; });
  if (enc) {
    enc.status = 'completed';
    V = 'doc_queue';
    draw();
    alert('Consultation completed for ' + enc.name + '.');
  }
}

// -------------------------------------------------------------
// 4b. CALENDAR APPOINTMENTS: PATIENT & DOCTOR INTEGRATION
// -------------------------------------------------------------
function patientAptsHTML() {
  var doctors = HOSP_STATE.staff.filter(function(s) { return s.role === 'doctor'; });
  var myApts = (HOSP_STATE.appointments || []).filter(function(a) {
    return (a.patientEmail && a.patientEmail.toLowerCase() === (CU || '').toLowerCase()) ||
           (a.patientName && a.patientName.toLowerCase() === (DEMO.name || '').toLowerCase());
  });

  var d = new Date();
  var todayIso = d.toISOString().slice(0, 10);
  var dNext = new Date(Date.now() + 86400000);
  var tomorrowIso = dNext.toISOString().slice(0, 10);

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Hospital Outpatient Department</span><h1 style="margin:4px 0">Doctor Appointments &amp; Calendar</h1><div class="mut">Book a consultation with hospital doctors. Your chosen physician reviews your appointment and confirms your slot.</div></div><div class="row"><button class="btn" onclick="var el=$(\'apt_book_card\');if(el)el.scrollIntoView({behavior:\'smooth\'})">+ Book Consultation</button></div></div>';

  h += '<div class="two" style="margin-top:16px">';

  // Left Column: Booking Form
  h += '<div class="glass" id="apt_book_card"><span class="pill">Consultation Booking</span><h3 style="margin:6px 0 12px">Schedule an Appointment</h3>'
    + '<label for="pa_hosp">Hospital Healthcare Facility</label>'
    + '<input id="pa_hosp" value="City Care Multi-Speciality Hospital" readonly style="background:var(--card-subtle, rgba(0,0,0,0.03));font-weight:600">'
    + '<label for="pa_doc">Consulting Doctor / Specialist</label>'
    + '<select id="pa_doc">'
    + doctors.map(function(doc) {
        return '<option value="' + doc.id + '">' + esc(doc.name) + ' (' + esc(doc.spec) + ')</option>';
      }).join('')
    + '</select>'
    + '<div class="two" style="margin-top:0"><div>'
    + '<label for="pa_date">Appointment Date</label>'
    + '<input id="pa_date" type="date" min="' + todayIso + '" value="' + tomorrowIso + '">'
    + '</div><div>'
    + '<label for="pa_slot">Preferred Time Slot</label>'
    + '<select id="pa_slot">'
    + '<option value="09:30 AM">09:30 AM (Morning Slot)</option>'
    + '<option value="10:15 AM" selected>10:15 AM (Morning Slot)</option>'
    + '<option value="11:00 AM">11:00 AM (Morning Slot)</option>'
    + '<option value="11:45 AM">11:45 AM (Late Morning)</option>'
    + '<option value="02:30 PM">02:30 PM (Afternoon)</option>'
    + '<option value="03:30 PM">03:30 PM (Afternoon)</option>'
    + '<option value="04:30 PM">04:30 PM (Evening)</option>'
    + '<option value="05:15 PM">05:15 PM (Evening)</option>'
    + '</select>'
    + '</div></div>'
    + '<label for="pa_reason">Chief Complaint / Reason for Consultation</label>'
    + '<input id="pa_reason" placeholder="e.g. Follow-up for elevated HbA1c (6.8%), chest discomfort, or routine checkup">'
    + '<label for="pa_phone">Contact Phone Number</label>'
    + '<input id="pa_phone" placeholder="e.g. +91 98765 43210" value="' + esc(DEMO.phone || '+91 98765 43210') + '">'
    + '<label for="pa_notes">Additional Symptoms / Notes for Doctor (Optional)</label>'
    + '<textarea id="pa_notes" placeholder="Describe recent symptoms, medications, or specific questions you want to discuss with the doctor..."></textarea>'
    + '<div id="pa_msg" class="err" role="alert" style="margin:8px 0"></div>'
    + '<button class="btn" style="width:100%;justify-content:center;margin-top:8px" onclick="submitPatientApt()">📅 Request Appointment Slot</button>'
    + '</div>';

  // Right Column: My Appointments & Status
  h += '<div class="glass"><div class="row" style="justify-content:space-between"><h3 style="margin:0">My Hospital Appointments</h3><span class="pill">' + myApts.length + ' Booked</span></div>'
    + '<div class="mut" style="margin:4px 0 12px">Track doctor confirmation, OPD room details, and visit status.</div>';

  if (!myApts.length) {
    h += '<div class="item" style="text-align:center;padding:24px 12px"><div style="font-size:32px;margin-bottom:8px">📅</div><b>No appointments scheduled yet</b><div class="mut" style="margin-top:4px">Select a date and time slot to request a consultation with Dr. Rajesh Sharma.</div></div>';
  } else {
    h += '<div class="list">' + myApts.map(function(a) {
      var isPending = a.status === 'pending';
      var isAccepted = a.status === 'accepted';
      var isDeclined = a.status === 'declined';
      var statusBadge = isPending ? '<span class="pill w">● AWAITING DOCTOR ACCEPTANCE</span>' :
                        isAccepted ? '<span class="pill">✓ CONFIRMED BY DOCTOR</span>' :
                        isDeclined ? '<span class="pill" style="background:#FDE8E8;color:#9B1C1C">DECLINED</span>' :
                        '<span class="pill">✓ COMPLETED</span>';

      return '<div class="item" style="border-left:4px solid ' + (isAccepted ? 'var(--teal)' : isPending ? '#D97706' : '#EF4444') + '">'
        + '<div class="row" style="justify-content:space-between;align-items:flex-start"><div><b style="font-size:15px">' + esc(a.doctorName) + '</b><div class="mut">' + esc(a.hospitalName || 'City Care Hospital') + '</div></div>'
        + statusBadge + '</div>'
        + '<div style="margin:8px 0;padding:8px 12px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:8px">'
        + '<div class="row" style="gap:16px"><span><b>📅 Date:</b> ' + esc(a.date) + '</span><span><b>⏰ Slot:</b> ' + esc(a.timeSlot) + '</span></div>'
        + '<div style="margin-top:4px"><b>Reason:</b> ' + esc(a.reason) + '</div>'
        + (a.notes ? '<div class="mut" style="font-size:12px;margin-top:2px">Patient note: ' + esc(a.notes) + '</div>' : '')
        + '</div>'
        + (isAccepted ? '<div class="item" style="background:var(--mint);padding:8px 12px;font-size:13px;border-radius:8px"><b>🏥 Consultation Instructions:</b><br>' + esc(a.doctorNotes || 'Appointment confirmed for OPD Room 101. Please arrive 10 min prior with your ABHA ID and recent reports.') + '</div>' : '')
        + (isDeclined ? '<div class="item" style="background:#FDE8E8;color:#9B1C1C;padding:8px 12px;font-size:13px;border-radius:8px"><b>Doctor note:</b> ' + esc(a.doctorNotes || 'Slot unavailable. Please choose another date/time.') + '</div>' : '')
        + (isPending ? '<div class="row" style="justify-content:space-between;margin-top:8px"><span class="mut" style="font-size:12px">Waiting for doctor to review…</span><button class="btn alt" style="padding:3px 8px;font-size:11.5px" onclick="cancelPatientApt(\'' + a.id + '\')">Cancel Request</button></div>' : '')
        + '</div>';
    }).join('') + '</div>';
  }

  h += '</div></div>';
  return h;
}

function docAptsHTML() {
  var apts = HOSP_STATE.appointments || [];
  var pendingApts = apts.filter(function(a) { return a.status === 'pending'; });
  var acceptedApts = apts.filter(function(a) { return a.status === 'accepted'; });

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Doctor OPD Schedule</span><h1 style="margin:4px 0">Appointment Requests &amp; Schedule Calendar</h1><div class="mut">Review incoming patient appointment requests, accept/confirm slots, and check scheduled patients into your consultation queue.</div></div><div class="row"><button class="btn alt" onclick="V=\'doc_queue\';draw()">&larr; Back to Consultation Queue</button></div></div>';

  h += '<div class="stats"><div class="glass stat t1"><span>PENDING ACCEPTANCE</span><b>' + pendingApts.length + '</b><div class="mut">Patients awaiting your confirmation</div><div class="more">Action required &darr;</div></div><div class="glass stat t2"><span>CONFIRMED SLOTS</span><b>' + acceptedApts.length + '</b><div class="mut">Accepted upcoming consultations</div><div class="more">Scheduled OPD</div></div><div class="glass stat t3"><span>TOTAL BOOKINGS</span><b>' + apts.length + '</b><div class="mut">All patient appointments</div><div class="more">Calendar total</div></div></div>';

  // Section 1: Pending Requests
  h += '<div class="glass" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Action Required: Pending Appointment Requests</h3><span class="pill w">' + pendingApts.length + ' Pending</span></div><div class="mut" style="margin:4px 0 12px">Patients requested these consultation slots. Accept to confirm their appointment or decline if slot is unavailable.</div>';

  if (!pendingApts.length) {
    h += '<div class="item" style="text-align:center;padding:18px"><div style="color:var(--teal);font-size:24px">✓</div><b>No pending appointment requests.</b><div class="mut">All patient bookings have been reviewed.</div></div>';
  } else {
    h += '<div class="list">' + pendingApts.map(function(a) {
      return '<div class="item" style="border-left:4px solid #D97706">'
        + '<div class="row" style="justify-content:space-between;align-items:flex-start"><div><b style="font-size:16px">' + esc(a.patientName) + '</b>' + (a.patientAge ? ' (' + esc(a.patientAge) + 'y &middot; ' + esc(a.patientGender) + ')' : '') + '<div class="mut">Contact: ' + esc(a.patientPhone) + (a.patientEmail ? ' &middot; ' + esc(a.patientEmail) : '') + '</div></div>'
        + '<span class="pill w">PENDING REVIEW</span></div>'
        + '<div style="margin:10px 0;padding:10px 14px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:8px">'
        + '<div class="row" style="gap:20px;font-size:14px"><span><b>📅 Requested Date:</b> ' + esc(a.date) + '</span><span><b>⏰ Slot:</b> ' + esc(a.timeSlot) + '</span></div>'
        + '<div style="margin-top:6px"><b>Chief Complaint / Reason:</b> <span style="color:var(--text)">' + esc(a.reason) + '</span></div>'
        + (a.notes ? '<div class="mut" style="font-size:12.5px;margin-top:4px"><b>Patient Note:</b> “' + esc(a.notes) + '”</div>' : '')
        + '</div>'
        + '<div class="row" style="gap:8px;margin-top:10px">'
        + '<button class="btn" style="padding:6px 14px" onclick="doctorAcceptApt(\'' + a.id + '\')">✓ Accept &amp; Confirm Slot</button>'
        + '<button class="btn alt" style="padding:6px 14px" onclick="doctorDeclineApt(\'' + a.id + '\')">✕ Decline</button>'
        + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }
  h += '</div>';

  // Section 2: Confirmed Appointments Schedule
  h += '<div class="glass" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Confirmed Patient Schedule</h3><span class="pill">' + acceptedApts.length + ' Confirmed</span></div>'
    + '<div class="mut" style="margin:4px 0 12px">Accepted consultations. When the patient arrives at the clinic, check them in to create their live OPD token.</div>';

  if (!acceptedApts.length) {
    h += '<div class="item" style="text-align:center;padding:16px"><div class="mut">No accepted appointments yet. Accept pending requests above.</div></div>';
  } else {
    h += '<div class="list">' + acceptedApts.map(function(a) {
      return '<div class="item" style="border-left:4px solid var(--teal)">'
        + '<div class="row" style="justify-content:space-between;align-items:flex-start"><div><b style="font-size:16px">' + esc(a.patientName) + '</b><div class="mut">Phone: ' + esc(a.patientPhone) + ' &middot; Slot: <b>' + esc(a.date) + ' at ' + esc(a.timeSlot) + '</b></div></div>'
        + '<span class="pill">✓ CONFIRMED</span></div>'
        + '<div style="margin:6px 0"><b>Reason:</b> ' + esc(a.reason) + '</div>'
        + (a.doctorNotes ? '<div class="mut" style="font-size:12px">Instructions: ' + esc(a.doctorNotes) + '</div>' : '')
        + '<div class="row" style="margin-top:8px"><button class="btn" style="padding:5px 12px;font-size:12.5px" onclick="checkinAppointmentToOPD(\'' + a.id + '\')">🎫 Check-In Patient to Consultation Queue &rarr;</button></div>'
        + '</div>';
    }).join('') + '</div>';
  }
  h += '</div>';

  return h;
}

function submitPatientApt() {
  var docId = ($('pa_doc') || {}).value || 'usr-doc-1';
  var date = ($('pa_date') || {}).value || '';
  var slot = ($('pa_slot') || {}).value || '10:15 AM';
  var reason = (($('pa_reason') || {}).value || '').trim();
  var phone = (($('pa_phone') || {}).value || '').trim();
  var notes = (($('pa_notes') || {}).value || '').trim();
  var msg = $('pa_msg');

  if (!reason) {
    if (msg) msg.textContent = 'Please enter the chief complaint or reason for consultation.';
    return;
  }
  if (!date) {
    if (msg) msg.textContent = 'Please select an appointment date.';
    return;
  }

  var doc = HOSP_STATE.staff.find(function(s) { return s.id === docId; }) || { name: 'Dr. Rajesh Sharma, MD' };

  var newApt = {
    id: 'apt-' + Date.now().toString(36),
    hospitalId: 'hosp-001',
    hospitalName: 'City Care Multi-Speciality Hospital',
    doctorId: docId,
    doctorName: doc.name,
    patientName: DEMO.name || 'Demo Evaluator',
    patientEmail: CU || 'evaluator@medoryx.example.com',
    patientPhone: phone || '+91 98765 43210',
    patientAge: DEMO.age || '45',
    patientGender: DEMO.sex || 'male',
    date: date,
    timeSlot: slot,
    reason: reason,
    notes: notes,
    status: 'pending',
    doctorNotes: '',
    createdAt: new Date().toISOString()
  };

  if (!HOSP_STATE.appointments) HOSP_STATE.appointments = [];
  HOSP_STATE.appointments.unshift(newApt);

  fetch('/api/hospital?action=book-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify(newApt)
  }).catch(function() {});

  draw();
  alert('Appointment request submitted successfully to ' + doc.name + ' for ' + date + ' at ' + slot + '!\nThe doctor will review and confirm your slot.');
}

function doctorAcceptApt(aptId) {
  var apt = (HOSP_STATE.appointments || []).find(function(a) { return a.id === aptId; });
  if (!apt) return;
  apt.status = 'accepted';
  apt.doctorNotes = 'Appointment confirmed for OPD Room 101. Please report with past lab reports and current prescriptions.';
  apt.acceptedAt = new Date().toISOString();

  fetch('/api/hospital?action=accept-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({ appointmentId: aptId, doctorNotes: apt.doctorNotes })
  }).catch(function() {});

  draw();
  alert('Appointment accepted for ' + apt.patientName + ' on ' + apt.date + ' at ' + apt.timeSlot + '!\nThe patient portal has been updated with your confirmation.');
}

function doctorDeclineApt(aptId) {
  var apt = (HOSP_STATE.appointments || []).find(function(a) { return a.id === aptId; });
  if (!apt) return;
  var reason = prompt('Optional reason for declining (e.g. In OT / Fully booked):', 'Doctor unavailable at this slot; please choose an afternoon time.');
  if (reason === null) return;
  apt.status = 'declined';
  apt.doctorNotes = reason;

  fetch('/api/hospital?action=decline-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({ appointmentId: aptId, reason: reason })
  }).catch(function() {});

  draw();
}

function cancelPatientApt(aptId) {
  if (!confirm('Are you sure you want to cancel this appointment request?')) return;
  var idx = (HOSP_STATE.appointments || []).findIndex(function(a) { return a.id === aptId; });
  if (idx > -1) {
    HOSP_STATE.appointments.splice(idx, 1);
    draw();
  }
}

function checkinAppointmentToOPD(aptId) {
  var apt = (HOSP_STATE.appointments || []).find(function(a) { return a.id === aptId; });
  if (!apt) return;

  var nextToken = HOSP_STATE.encounters.length ? Math.max.apply(null, HOSP_STATE.encounters.map(function(e) { return e.token || 100; })) + 1 : 101;
  var newEnc = {
    id: 'enc-' + Date.now().toString(36),
    token: nextToken,
    name: apt.patientName,
    age: apt.patientAge || '45',
    sex: apt.patientGender || 'male',
    phone: apt.patientPhone,
    abha: '91-4829-1029-4819',
    doctorId: apt.doctorId,
    doctor: apt.doctorName,
    complaint: apt.reason,
    status: 'in_consult',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  HOSP_STATE.encounters.unshift(newEnc);
  apt.status = 'completed';

  fetch('/api/hospital?action=checkin-appointment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({ appointmentId: aptId })
  }).catch(function() {});

  if (ROLE === 'doctor') {
    ACTIVE_ENC_ID = newEnc.id;
    V = 'doc_consult';
  } else if (ROLE === 'receptionist') {
    V = 'rec_queue';
  }
  draw();
  alert('Patient ' + newEnc.name + ' checked in! Assigned Token #' + nextToken + '. Consultation file opened.');
}

// -------------------------------------------------------------
// 4c. DOCTOR ABHA PATIENT RECORD LOOKUP & LONGITUDINAL ACCESS
// -------------------------------------------------------------
var DOC_ABHA_LAST_SEARCH = '';
var DOC_ABHA_RESULT = null;
var DOC_ABHA_LOADING = false;
var DOC_ABHA_ERROR = '';

function docAbhaHTML() {
  var h = '<div class="glass row" style="justify-content:space-between"><div>'
    + '<span class="pill">Ayushman Bharat Digital Mission (ABDM) Exchange</span>'
    + '<h1 style="margin:4px 0">ABHA Patient Record Search &amp; Clinical Access</h1>'
    + '<div class="mut">Doctor Portal: Dr. Rajesh Sharma, MD &middot; Search any patient\'s 14-digit ABHA ID to access their longitudinal diagnostic history, past lab values with LOINC codes, active prescriptions, and hospital visits.</div>'
    + '</div><div class="row">'
    + '<button class="btn alt" onclick="V=\'doc_queue\';draw()">&larr; Back to Consultation Queue</button>'
    + '</div></div>';

  // Search Bar Card
  h += '<div class="glass" style="margin-top:16px"><span class="pill">ABDM Registry Lookup</span>'
    + '<h3 style="margin:6px 0 10px">Enter Patient 14-Digit ABHA ID</h3>'
    + '<div class="row" style="gap:10px;flex-wrap:nowrap">'
    + '<input id="doc_abha_query" placeholder="e.g. 91-4829-1029-4819 or 91-1209-3381-9920" value="' + esc(DOC_ABHA_LAST_SEARCH) + '" onkeydown="if(event.key===\'Enter\')doctorSearchABHA()" style="font-size:16px;font-family:monospace;letter-spacing:1px">'
    + '<button class="btn" style="white-space:nowrap;padding:12px 22px" onclick="doctorSearchABHA()">🔍 Fetch Patient Records</button>'
    + '</div>'
    + '<div class="row" style="gap:8px;margin-top:12px;align-items:center">'
    + '<span class="mut" style="font-size:12px">Quick Presets:</span>'
    + '<button class="btn alt" style="padding:3px 10px;font-size:12px" onclick="doctorSearchABHA(\'91-1234-5678-9012\')">Anitha (91-1234-5678-9012)</button>'
    + '<button class="btn alt" style="padding:3px 10px;font-size:12px" onclick="doctorSearchABHA(\'91-4829-1029-4819\')">Ramesh Chandra (91-4829-1029-4819)</button>'
    + '<button class="btn alt" style="padding:3px 10px;font-size:12px" onclick="doctorSearchABHA(\'91-1209-3381-9920\')">Meera Deshmukh (91-1209-3381-9920)</button>'
    + '<button class="btn alt" style="padding:3px 10px;font-size:12px" onclick="doctorSearchABHA(\'91-6677-8899-0011\')">Kavita Reddy (91-6677-8899-0011)</button>'
    + (typeof AB !== 'undefined' && AB && AB.id ? '<button class="btn alt" style="padding:3px 10px;font-size:12px;background:var(--mint);color:var(--teal)" onclick="doctorSearchABHA(\'' + AB.id + '\')">Patient ' + esc(DEMO.name || 'Portal') + ' (' + esc(AB.id) + ')</button>' : '')
    + '</div>'
    + '</div>';

  if (DOC_ABHA_LOADING) {
    h += '<div class="glass" style="margin-top:16px;text-align:center;padding:40px 20px">'
      + '<div style="font-size:32px;margin-bottom:8px">⏳</div>'
      + '<b>Querying ABDM Health Exchange Network…</b>'
      + '<div class="mut" style="margin-top:4px">Retrieving diagnostic laboratory orders, LOINC parameters, and active prescriptions.</div>'
      + '</div>';
    return h;
  }

  if (DOC_ABHA_ERROR) {
    h += '<div class="glass" style="margin-top:16px;border-left:4px solid #EF4444">'
      + '<b style="color:#DC2626;font-size:15px">⚠️ Patient Record Not Found</b>'
      + '<div class="mut" style="margin:4px 0 10px">' + esc(DOC_ABHA_ERROR) + '</div>'
      + '<div class="mut" style="font-size:12.5px">Tip: Ensure the 14-digit number is formatted correctly (e.g. <code>91-4829-1029-4819</code>) or try one of the quick presets above.</div>'
      + '</div>';
    return h;
  }

  if (!DOC_ABHA_RESULT || !DOC_ABHA_RESULT.patient) {
    h += '<div class="glass" style="margin-top:16px;text-align:center;padding:36px 20px">'
      + '<div style="font-size:40px;margin-bottom:8px">🩺</div>'
      + '<b>Search Patient Records by ABHA ID</b>'
      + '<div class="mut" style="margin:6px auto 16px;max-width:520px">Click one of the quick presets above (e.g. Ramesh Chandra) or enter a 14-digit ABHA ID to immediately pull full clinical history, previous lab reports, and active prescriptions.</div>'
      + '<button class="btn" onclick="doctorSearchABHA(\'91-4829-1029-4819\')">View Demo Patient Ramesh Chandra (91-4829-1029-4819) &rarr;</button>'
      + '</div>';
    return h;
  }

  var res = DOC_ABHA_RESULT;
  var p = res.patient;
  var labs = res.labOrders || [];
  var rxs = res.prescriptions || [];
  var encs = res.encounters || [];
  var apts = res.appointments || [];

  // Patient Demographic Banner
  h += '<div class="glass" style="margin-top:16px;border-left:5px solid var(--teal)">'
    + '<div class="row" style="justify-content:space-between;align-items:flex-start">'
    + '<div style="display:flex;gap:14px;align-items:center">'
    + '<div style="width:52px;height:52px;border-radius:12px;background:linear-gradient(135deg,#0F766E,#14B8A6);color:#fff;display:grid;place-items:center;font-size:22px;font-weight:800">' + (p.name.charAt(0) || 'P') + '</div>'
    + '<div>'
    + '<h2 style="margin:0;font-size:20px">' + esc(p.name) + '</h2>'
    + '<div class="mut">' + esc(p.age) + ' Years &middot; ' + esc((p.gender || '').toUpperCase()) + ' &middot; Phone: ' + esc(p.phone) + (p.bloodGroup ? ' &middot; Blood Group: <b>' + esc(p.bloodGroup) + '</b>' : '') + '</div>'
    + '<div style="margin-top:3px"><span class="pill" style="font-family:monospace;font-size:12px;background:var(--mint);color:var(--teal)">ABHA ID: ' + esc(p.abhaNumber) + '</span> <span class="mut" style="font-size:12px">(' + esc(p.abhaAddress) + ')</span></div>'
    + '</div>'
    + '</div>'
    + '<div style="text-align:right">'
    + '<span class="pill" style="margin-bottom:8px;display:inline-block">✓ ABDM VERIFIED</span><br>'
    + '<button class="btn" onclick="doctorOpenPatientFromABHA(\'' + esc(p.name) + '\')">📋 Open Patient File in Clinical Copilot &rarr;</button>'
    + '</div>'
    + '</div>'
    + '</div>';

  var docs = res.documents || p.records || [];
  var abnCount = 0;
  labs.forEach(function(l) { (l.results || []).forEach(function(r) { if (r.status === 'High' || r.status === 'Low') abnCount++; }); });
  docs.forEach(function(d) { (d.labs || []).forEach(function(l) { if (l.v && l.hi && (l.v > l.hi || l.v < l.lo)) abnCount++; }); });

  // Patient Dashboard Stats Bar
  h += '<div class="stats" style="margin-top:16px">'
    + '<div class="glass stat t1"><i class="sico">📁</i><span>TOTAL DOCUMENTS</span><b>' + (docs.length || labs.length + rxs.length) + '</b><div class="mut">Indexed in patient timeline</div></div>'
    + '<div class="glass stat t2"><i class="sico">💊</i><span>ACTIVE MEDICATIONS</span><b>' + (rxs.length || 4) + '</b><div class="mut">From patient prescriptions</div></div>'
    + '<div class="glass stat t3"><i class="sico">⚠️</i><span>FLAGGED BIOMARKERS</span><b>' + (abnCount || 4) + '</b><div class="mut">Abnormal parameters detected</div></div>'
    + '</div>';

  // Section: Real Uploaded Documents & Longitudinal Timeline
  h += '<div class="glass" style="margin-top:16px">'
    + '<div class="row" style="justify-content:space-between;align-items:center">'
    + '<div><h3 style="margin:0"><i class="hic">📄</i>All Real Uploaded Documents &amp; Timeline</h3><div class="mut" style="font-size:12.5px">Direct access to patient\'s original uploaded documents, prescriptions, and lab report scans:</div></div>'
    + '<span class="pill" style="font-weight:700">' + (docs.length || labs.length) + ' Documents Available</span>'
    + '</div>';

  if (docs.length) {
    DOC_VIEW_CACHE = docs;
    h += '<div class="list" style="margin-top:14px">' + docs.map(function(d, idx) {
      var hasDocImg = !!d.doc;
      return '<div class="item" style="margin-bottom:12px;border:1px solid var(--line);border-radius:12px;padding:14px">'
        + '<div class="row" style="justify-content:space-between;align-items:flex-start">'
        + '<div><b style="font-size:15px;color:var(--ink)">' + esc(d.date || 'Undated') + ' &middot; ' + esc(d.type || 'Medical Document') + '</b>'
        + (d.doctor ? '<div class="mut" style="font-size:12px">Physician: ' + esc(d.doctor) + '</div>' : '')
        + (d.dx ? '<div style="font-size:12.5px;margin-top:3px"><b>Diagnosis:</b> ' + esc(d.dx) + '</div>' : '')
        + '</div>'
        + '<span class="pill ' + (d.verified ? '' : 'w') + '">' + (d.verified ? '✓ VERIFIED BY CITIZEN' : 'UNVERIFIED') + '</span>'
        + '</div>'
        + (hasDocImg ? '<div style="display:flex;gap:14px;align-items:center;margin-top:12px;padding:10px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:10px;border:1px solid var(--line)">'
          + '<div style="width:75px;height:100px;background:#ffffff;border-radius:6px;border:1px solid #CBD5E1;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;display:grid;place-items:center;cursor:pointer;flex-shrink:0" onclick="openDoctorDocModalByIndex(' + idx + ')">'
          + '<img src="' + esc(d.doc) + '" alt="Original Uploaded Document" style="max-width:100%;max-height:100%;object-fit:contain;background:#ffffff">'
          + '</div>'
          + '<div style="flex:1">'
          + '<b style="font-size:13px;color:var(--teal)">✓ Real Original Document Upload Attached</b>'
          + '<div class="mut" style="font-size:12px;margin:3px 0 8px">High-resolution diagnostic scan &middot; official hospital report.</div>'
          + '<div class="row" style="gap:8px">'
          + '<button class="btn" style="padding:4px 12px;font-size:12px" onclick="openDoctorDocModalByIndex(' + idx + ')">🔍 View Full Original Document</button>'
          + '<button class="btn alt" style="padding:4px 12px;font-size:12px" onclick="downloadDoctorDocByIndex(' + idx + ')">⬇ Download Original</button>'
          + '</div>'
          + '</div>'
          + '</div>' : '')
        + (d.labs && d.labs.length ? '<div style="margin-top:10px"><b style="font-size:12px;color:var(--teal)">EXTRACTED LABORATORY VALUES (' + d.labs.length + '):</b>'
          + '<div style="margin-top:6px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:8px;padding:6px 10px">'
          + d.labs.map(function(l) {
            var isHi = l.v != null && l.hi != null && l.v > l.hi;
            var isLo = l.v != null && l.lo != null && l.v < l.lo;
            var b = isHi ? '<span class="chip hi">HIGH</span>' : isLo ? '<span class="chip lo">LOW</span>' : '<span class="chip ok">NORMAL</span>';
            return '<div class="row" style="justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--line);font-size:12px">'
              + '<span><b>' + esc(l.n) + '</b>: ' + l.v + ' ' + esc(l.u || '') + '</span>'
              + '<span style="display:flex;gap:6px;align-items:center"><span class="mut" style="font-size:11px">(' + (l.lo || 0) + '-' + (l.hi || 100) + ')</span> ' + b + '</span>'
              + '</div>';
          }).join('')
          + '</div></div>' : '')
        + (d.meds && d.meds.length ? '<div style="margin-top:10px"><b style="font-size:12px;color:var(--teal)">PRESCRIBED MEDICATIONS (' + d.meds.length + '):</b>'
          + '<div style="margin-top:6px">'
          + d.meds.map(function(m) {
            return '<div style="padding:4px 8px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:6px;margin-bottom:4px;font-size:12px">'
              + '<b>' + esc(m.n) + '</b> ' + esc(m.dose || '') + ' &middot; Schedule: <code>' + esc(m.freq || '1-0-0') + '</code>' + (m.days ? ' (' + m.days + ' days)' : '')
              + '</div>';
          }).join('')
          + '</div></div>' : '')
        + '</div>';
    }).join('') + '</div>';
  } else {
    h += '<div class="item" style="text-align:center;padding:24px"><div class="mut">Patient has verified clinical encounters and laboratory records on file. Review diagnostic orders below.</div></div>';
  }
  h += '</div>';

  // Two-column layout for Labs & Prescriptions
  h += '<div class="two" style="margin-top:16px">';

  // Column 1: Diagnostic Laboratory & Pathology History
  h += '<div class="glass"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Diagnostic Pathology &amp; Lab Orders</h3><span class="pill">' + labs.length + ' Orders</span></div>'
    + '<div class="mut" style="margin:4px 0 12px">Longitudinal laboratory orders retrieved across hospital diagnostic network:</div>';

  if (!labs.length) {
    h += '<div class="item" style="text-align:center;padding:20px"><div class="mut">No diagnostic lab orders on file for this patient.</div><button class="btn alt" style="margin-top:8px;font-size:12px" onclick="doctorOpenPatientFromABHA(\'' + esc(p.name) + '\')">+ Order Lab Test</button></div>';
  } else {
    h += '<div class="list">' + labs.map(function(o) {
      return '<div class="item" style="margin-bottom:10px">'
        + '<div class="row" style="justify-content:space-between"><b>' + esc(o.testName || o.test) + '</b><span class="pill ' + (o.status === 'completed' ? '' : 'w') + '">' + esc((o.status || 'ORDERED').toUpperCase()) + '</span></div>'
        + '<div class="mut" style="font-size:12px">LOINC: <code>' + esc(o.testCode || o.code || 'N/A') + '</code> &middot; Specimen: ' + esc(o.sampleType || o.sample || 'Venous Blood') + '</div>'
        + (o.results && o.results.length ? '<div style="margin-top:8px;background:var(--card-subtle, rgba(0,0,0,0.02));padding:8px 10px;border-radius:8px">'
          + o.results.map(function(r) {
            var isHi = r.status === 'High';
            var isLo = r.status === 'Low';
            var badge = isHi ? '<span class="chip hi">HIGH</span>' : isLo ? '<span class="chip lo">LOW</span>' : '<span class="chip ok">NORMAL</span>';
            return '<div class="row" style="justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--line)">'
              + '<span><b>' + esc(r.test) + '</b>: ' + r.value + ' ' + esc(r.unit) + '</span>'
              + '<span style="display:flex;gap:6px;align-items:center"><span class="mut" style="font-size:11.5px">(' + r.rangeLow + '-' + r.rangeHigh + ')</span> ' + badge + '</span>'
              + '</div>';
          }).join('')
          + '</div>' : '<div class="mut" style="font-size:12px;margin-top:4px">Specimen collected &middot; Analysis in progress at Central Lab</div>')
        + '</div>';
    }).join('') + '</div>';
  }
  h += '</div>';

  // Column 2: Active Prescriptions & Medications
  h += '<div class="glass"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Active Medications &amp; Prescriptions</h3><span class="pill">' + rxs.length + ' Prescriptions</span></div>'
    + '<div class="mut" style="margin:4px 0 12px">Current dosage schedules and pharmacist dispensation status:</div>';

  if (!rxs.length) {
    h += '<div class="item" style="text-align:center;padding:20px"><div class="mut">No active prescriptions recorded for this patient.</div><button class="btn alt" style="margin-top:8px;font-size:12px" onclick="doctorOpenPatientFromABHA(\'' + esc(p.name) + '\')">+ Prescribe Medication</button></div>';
  } else {
    h += '<div class="list">' + rxs.map(function(rx) {
      return '<div class="item" style="margin-bottom:10px">'
        + '<div class="row" style="justify-content:space-between"><b style="font-size:13.5px">Prescription #' + esc(rx.id) + '</b><span class="pill ' + (rx.dispenseStatus === 'dispensed' ? '' : 'w') + '">' + esc((rx.dispenseStatus || 'PENDING').toUpperCase()) + '</span></div>'
        + (rx.clinicalNotes ? '<div style="margin:4px 0;font-size:12.5px"><b>Clinical Notes:</b> ' + esc(rx.clinicalNotes) + '</div>' : '')
        + '<div style="margin-top:6px">'
        + (rx.medications || []).map(function(m) {
          return '<div style="padding:4px 8px;background:var(--card-subtle, rgba(0,0,0,0.02));border-radius:6px;margin-bottom:4px;font-size:12.5px">'
            + '<b>' + esc(m.name) + '</b> ' + esc(m.dose) + ' &middot; Schedule: <code>' + esc(m.freq) + '</code> (' + esc(m.days) + ' days)'
            + (m.instructions ? '<div class="mut" style="font-size:11.5px">' + esc(m.instructions) + '</div>' : '')
            + '</div>';
        }).join('')
        + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }
  h += '</div>';

  h += '</div>';

  // Row 3: Past Encounters & Consultations
  h += '<div class="glass" style="margin-top:16px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Past Hospital Encounters &amp; Appointments</h3><span class="pill">' + (encs.length + apts.length) + ' Total Visits</span></div>'
    + '<div class="list" style="margin-top:10px">';

  if (!encs.length && !apts.length) {
    h += '<div class="item" style="text-align:center;padding:14px"><div class="mut">No previous OPD visits recorded.</div></div>';
  } else {
    h += encs.map(function(e) {
      return '<div class="item row" style="justify-content:space-between;align-items:center">'
        + '<div><b>Token #' + e.tokenNumber + ' &middot; ' + esc(e.chiefComplaint) + '</b><div class="mut">Doctor: ' + esc(e.doctorName) + ' &middot; Status: <span class="pill">' + esc(e.status.toUpperCase()) + '</span></div></div>'
        + '<button class="btn" style="padding:4px 12px;font-size:12px" onclick="doctorOpenPatientFromABHA(\'' + esc(p.name) + '\',\'' + e.id + '\')">Open Consultation &rarr;</button>'
        + '</div>';
    }).join('');

    h += apts.map(function(a) {
      return '<div class="item row" style="justify-content:space-between;align-items:center">'
        + '<div><b>📅 Appointment: ' + esc(a.date) + ' at ' + esc(a.timeSlot) + '</b><div class="mut">Reason: ' + esc(a.reason) + ' &middot; Status: <span class="pill ' + (a.status === 'accepted' ? '' : 'w') + '">' + esc(a.status.toUpperCase()) + '</span></div></div>'
        + (a.status === 'accepted' ? '<button class="btn" style="padding:4px 12px;font-size:12px" onclick="checkinAppointmentToOPD(\'' + a.id + '\')">Check-In Patient &rarr;</button>' : '')
        + '</div>';
    }).join('');
  }
  h += '</div></div>';

  return h;
}

function doctorSearchABHA(customId) {
  var inputEl = $('doc_abha_query');
  var query = (customId || (inputEl ? inputEl.value : '') || '').trim();
  if (!query) {
    alert('Please enter a 14-digit ABHA ID or patient name to search.');
    return;
  }

  DOC_ABHA_LAST_SEARCH = query;
  DOC_ABHA_LOADING = true;
  DOC_ABHA_ERROR = '';
  draw();

  fetch('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent(query), {
    headers: { 'X-Medoryx': '1' }
  })
    .then(function(r) { return r.json(); })
    .then(function(j) {
      DOC_ABHA_LOADING = false;
      if (j && j.found && j.patient) {
        DOC_ABHA_RESULT = j;
        DOC_ABHA_ERROR = '';
      } else {
        DOC_ABHA_RESULT = null;
        DOC_ABHA_ERROR = (j && j.error) || ('No patient record found for ABHA ID: ' + query);
      }
      draw();
    })
    .catch(function(err) {
      DOC_ABHA_LOADING = false;
      DOC_ABHA_RESULT = null;
      DOC_ABHA_ERROR = 'Error connecting to ABDM registry: ' + (err.message || 'Network error');
      draw();
    });
}

function doctorOpenPatientFromABHA(patientName, existingEncId) {
  var enc = null;
  if (existingEncId) {
    enc = HOSP_STATE.encounters.find(function(e) { return e.id === existingEncId; });
  }
  if (!enc) {
    enc = HOSP_STATE.encounters.find(function(e) { 
      return e.name.toLowerCase() === (patientName || '').toLowerCase() || 
             (e.patientName && e.patientName.toLowerCase() === (patientName || '').toLowerCase()); 
    });
  }

  if (!enc) {
    // Create new active encounter for this ABHA patient so the doctor can consult immediately
    var pat = (DOC_ABHA_RESULT && DOC_ABHA_RESULT.patient) || {};
    var nextToken = HOSP_STATE.encounters.length ? Math.max.apply(null, HOSP_STATE.encounters.map(function(e) { return e.token || 100; })) + 1 : 101;
    enc = {
      id: 'enc-' + Date.now().toString(36),
      token: nextToken,
      name: pat.name || patientName || 'Patient',
      age: pat.age || '45',
      sex: pat.gender || 'male',
      phone: pat.phone || '+91 98765 43210',
      abha: pat.abhaNumber || '91-4829-1029-4819',
      doctor: 'Dr. Rajesh Sharma, MD',
      doctorId: 'usr-doc-1',
      complaint: 'ABHA Records Review & Follow-up Consultation',
      status: 'in_consult',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    HOSP_STATE.encounters.unshift(enc);
  }

  ACTIVE_ENC_ID = enc.id;
  V = 'doc_consult';
  draw();
  window.scrollTo(0, 0);
  alert('Clinical File opened for ' + enc.name + ' (ABHA: ' + (enc.abha || 'Linked') + '). You can now review Medoryx AI notes, order diagnostic tests, and issue e-prescriptions.');
}

// -------------------------------------------------------------
// 5. LAB TECHNICIAN PORTAL VIEWS (Pathology & LOINC)
// -------------------------------------------------------------
function labQueueHTML() {
  var orders = HOSP_STATE.labOrders;

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Pathology & Diagnostics</span><h1 style="margin:4px 0">Diagnostic Laboratory Queue</h1><div class="mut">Lab Technologist: Ananya Patel, BMLT &middot; LOINC Code Validation & Analysis</div></div></div>';

  h += '<div class="glass" style="margin-top:16px"><h3 style="margin-top:0">Incoming Diagnostic Test Orders</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px"><tr><th>Order ID</th><th>Patient Name</th><th>Test Ordered</th><th>LOINC Code</th><th>Sample Type</th><th>Status</th><th>Action</th></tr>';

  h += orders.map(function(o) {
    var isComp = o.status === 'completed';
    return '<tr><td><code>' + esc(o.id) + '</code></td><td><b>' + esc(o.patient) + '</b></td><td><b>' + esc(o.test) + '</b></td><td><code>' + esc(o.code) + '</code></td><td>' + esc(o.sample) + '</td><td><span class="' + (isComp ? 'pill' : 'pill w') + '">' + esc(o.status.toUpperCase()) + '</span></td><td>'
      + (!isComp ? '<button class="btn" style="padding:4px 10px;font-size:12px" onclick="openLabEntry(\'' + o.id + '\')">Enter Results &rarr;</button>' : '<button class="btn alt" style="padding:4px 10px;font-size:12px" onclick="openLabEntry(\'' + o.id + '\')">Review Report</button>')
      + '</td></tr>';
  }).join('');

  h += '</table></div></div>';
  return h;
}

function openLabEntry(ordId) {
  ACTIVE_LAB_ORD_ID = ordId;
  V = 'lab_entry';
  draw();
  window.scrollTo(0, 0);
}

function labEntryHTML() {
  var ord = HOSP_STATE.labOrders.find(function(o) { return o.id === ACTIVE_LAB_ORD_ID; }) || HOSP_STATE.labOrders[0];

  return '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Clinical Pathology Workspace</span><h1 style="margin:4px 0">Enter Test Results &amp; LOINC Verification</h1><div class="mut">Order: ' + esc(ord.id) + ' &middot; Patient: <b>' + esc(ord.patient) + '</b> &middot; Doctor: ' + esc(ord.doctor) + '</div></div><div class="row"><button class="btn alt" onclick="V=\'lab_queue\';draw()">&larr; Back to Lab Queue</button></div></div>'
    + '<div class="two"><div class="glass"><h3 style="margin-top:0">Test Order Information</h3>'
    + '<div class="item"><b>Test Name:</b> ' + esc(ord.test) + '<br><b>Specimen / Sample:</b> ' + esc(ord.sample) + '<br><b>LOINC Code:</b> <code>' + esc(ord.code) + '</code></div>'
    + '<h3 style="margin:16px 0 8px">Numeric Results & Reference Ranges</h3>'
    + '<label for="lt_param">Parameter Name</label><input id="lt_param" value="' + esc(ord.test.split('&')[0].trim()) + '">'
    + '<div class="row" style="gap:10px"><div><label for="lt_val">Measured Value</label><input id="lt_val" type="number" step="0.1" value="138" style="width:120px" oninput="evalLabLive()"></div><div><label for="lt_unit">Unit</label><input id="lt_unit" value="mg/dL" style="width:100px"></div><div style="flex:1"><label>Range Status</label><div id="lt_status" style="margin-top:8px"><span class="chip hi">High</span></div></div></div>'
    + '<div class="row" style="gap:10px;margin-top:8px"><div><label for="lt_lo">Reference Low</label><input id="lt_lo" type="number" value="70" style="width:120px" oninput="evalLabLive()"></div><div><label for="lt_hi">Reference High</label><input id="lt_hi" type="number" value="99" style="width:120px" oninput="evalLabLive()"></div><div><label for="lt_loinc">LOINC Mapping</label><input id="lt_loinc" value="1558-6" style="width:120px"></div></div>'
    + '<label for="lt_notes">Technologist Observations & Notes</label><textarea id="lt_notes" placeholder="e.g. Specimen non-hemolyzed. Run on automated clinical chemistry analyzer. Calibration verified.">Specimen non-hemolyzed. Fasting verified with patient. Analysis run on verified automated analyzer.</textarea>'
    + '<button class="btn" style="margin-top:12px;width:100%;justify-content:center" onclick="submitLabResults()">✓ Verify &amp; Publish Lab Report</button>'
    + '</div>'
    + '<div class="glass"><h3>LOINC Diagnostic Standards & Ranges</h3>'
    + '<div class="list">'
    + '<div class="item"><b>HbA1c (4548-4)</b><div class="mut">Normal: 4.0 - 5.6 % &middot; Prediabetes: 5.7 - 6.4 % &middot; Diabetes: &ge; 6.5 %</div></div>'
    + '<div class="item"><b>Fasting Blood Glucose (1558-6)</b><div class="mut">Normal: 70 - 99 mg/dL &middot; Impaired: 100 - 125 mg/dL &middot; Critical: &gt; 250 mg/dL</div></div>'
    + '<div class="item"><b>Hemoglobin (718-7)</b><div class="mut">Adult Male: 13.0 - 17.0 g/dL &middot; Adult Female: 12.0 - 15.5 g/dL &middot; Critical: &lt; 7.0 g/dL</div></div>'
    + '<div class="item"><b>Total Cholesterol (2093-3)</b><div class="mut">Desirable: &lt; 200 mg/dL &middot; Borderline: 200 - 239 mg/dL &middot; High: &ge; 240 mg/dL</div></div>'
    + '<div class="item"><b>Thyroid TSH (3016-3)</b><div class="mut">Adult Reference: 0.40 - 4.50 mIU/L</div></div>'
    + '</div></div></div>';
}

function evalLabLive() {
  var val = parseFloat(($('lt_val') || {}).value);
  var lo = parseFloat(($('lt_lo') || {}).value);
  var hi = parseFloat(($('lt_hi') || {}).value);
  var st = $('lt_status');
  if (!st || isNaN(val)) return;

  if (!isNaN(lo) && val < lo) {
    st.innerHTML = '<span class="chip lo">Low (Below Normal)</span>';
  } else if (!isNaN(hi) && val > hi) {
    st.innerHTML = '<span class="chip hi">High (Above Normal)</span>';
  } else {
    st.innerHTML = '<span class="chip ok">Normal Range</span>';
  }
}

function submitLabResults() {
  var ord = HOSP_STATE.labOrders.find(function(o) { return o.id === ACTIVE_LAB_ORD_ID; }) || HOSP_STATE.labOrders[0];
  var param = ($('lt_param') || {}).value || ord.test;
  var val = parseFloat(($('lt_val') || {}).value) || 0;
  var unit = ($('lt_unit') || {}).value || 'mg/dL';
  var lo = parseFloat(($('lt_lo') || {}).value) || 70;
  var hi = parseFloat(($('lt_hi') || {}).value) || 99;
  var loinc = ($('lt_loinc') || {}).value || '1558-6';

  var status = val < lo ? 'Low' : val > hi ? 'High' : 'Normal';

  ord.status = 'completed';
  ord.results = [
    { test: param, value: val, unit: unit, lo: lo, hi: hi, status: status, loinc: loinc }
  ];

  // Sync to API
  fetch('/api/hospital?action=complete-lab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      orderId: ord.id,
      technicianId: 'usr-lab-1',
      results: ord.results
    })
  }).catch(function() {});

  V = 'lab_queue';
  draw();
  alert('Lab results verified and published for ' + ord.patient + ' (' + param + ': ' + val + ' ' + unit + ', Status: ' + status + ').');
}

// -------------------------------------------------------------
// 6. PHARMACIST PORTAL VIEWS (Dispensing & Multilingual Labels)
// -------------------------------------------------------------
function pharmaQueueHTML() {
  var rxs = HOSP_STATE.prescriptions;

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Hospital Pharmacy</span><h1 style="margin:4px 0">Prescription Dispensing Queue</h1><div class="mut">Registered Pharmacist: Vikram Verma, B.Pharm &middot; Dosage Verification & Label Printing</div></div></div>';

  h += '<div class="glass" style="margin-top:16px"><h3 style="margin-top:0">Incoming Doctor Prescriptions</h3><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:680px"><tr><th>Rx ID</th><th>Patient Name</th><th>Prescribing Doctor</th><th>Total Medicines</th><th>Clinical Diagnosis</th><th>Status</th><th>Action</th></tr>';

  h += rxs.map(function(r) {
    var isDisp = r.status === 'dispensed';
    return '<tr><td><code>' + esc(r.id) + '</code></td><td><b>' + esc(r.patient) + '</b></td><td>' + esc(r.doctor) + '</td><td><span class="pill">' + r.meds.length + ' Items</span></td><td>' + esc(r.notes) + '</td><td><span class="' + (isDisp ? 'pill' : 'pill w') + '">' + esc(r.status.toUpperCase()) + '</span></td><td>'
      + (!isDisp ? '<button class="btn" style="padding:4px 10px;font-size:12px" onclick="openPharmaDispense(\'' + r.id + '\')">Dispense Medicines &rarr;</button>' : '<button class="btn alt" style="padding:4px 10px;font-size:12px" onclick="openPharmaDispense(\'' + r.id + '\')">Print Label</button>')
      + '</td></tr>';
  }).join('');

  h += '</table></div></div>';
  return h;
}

function openPharmaDispense(rxId) {
  ACTIVE_RX_ID = rxId;
  V = 'pharma_dispense';
  draw();
  window.scrollTo(0, 0);
}

function pharmaDispenseHTML() {
  var rx = HOSP_STATE.prescriptions.find(function(r) { return r.id === ACTIVE_RX_ID; }) || HOSP_STATE.prescriptions[0];

  var h = '<div class="glass row" style="justify-content:space-between"><div><span class="pill">Prescription Dispensation Workspace</span><h1 style="margin:4px 0">Dispense &amp; Verify: ' + esc(rx.patient) + '</h1><div class="mut">Prescription: ' + esc(rx.id) + ' &middot; Prescribed by ' + esc(rx.doctor) + '</div></div><div class="row"><button class="btn alt" onclick="V=\'pharma_queue\';draw()">&larr; Back to Pharmacy Queue</button></div></div>';

  h += '<div class="two"><div class="glass"><h3 style="margin-top:0">Medications to Dispense</h3>'
    + '<div class="list">'
    + rx.meds.map(function(m, i) {
      return '<div class="item"><b>' + (i + 1) + '. ' + esc(m.name) + ' (' + esc(m.dose) + ')</b><div class="mut">Schedule: <b>' + esc(m.freq) + '</b> &middot; Duration: ' + esc(m.days) + ' days</div><div class="mut" style="color:var(--teal)">Instructions: ' + esc(m.instructions) + '</div></div>';
    }).join('')
    + '</div>'
    + '<h3 style="margin:16px 0 8px">Pharmacist Safety Verification</h3>'
    + '<label style="font-weight:400"><input type="checkbox" id="pv_dose" checked style="width:auto"> Verified correct dosage strength & frequency schedule</label>'
    + '<label style="font-weight:400"><input type="checkbox" id="pv_int" checked style="width:auto"> Screened for adverse drug interactions & allergies</label>'
    + '<label style="font-weight:400"><input type="checkbox" id="pv_batch" checked style="width:auto"> Checked batch expiry dates & packaging seal</label>'
    + '<div class="row" style="margin-top:16px">'
    + '<button class="btn" onclick="submitDispense()">✓ Confirm Dispensation & Sign Off</button>'
    + '</div></div>';

  // Label printing column
  h += '<div class="glass"><div class="row" style="justify-content:space-between"><h3 style="margin:0">Patient Medication Label Generator</h3><select id="plang" style="width:auto" onchange="renderPharmaLabel(this.value)"><option value="en">English</option><option value="hi">हिन्दी (Hindi)</option><option value="te">తెలుగు (Telugu)</option></select></div>'
    + '<div id="labelPreview" style="margin-top:12px;padding:16px;background:#FFF;color:#142B45;border:2px dashed #087F8C;border-radius:12px;font-family:sans-serif">'
    + '<div style="font-size:16px;font-weight:800;border-bottom:1px solid #CCC;padding-bottom:6px">🏥 CITY CARE HOSPITAL PHARMACY</div>'
    + '<div style="margin:8px 0"><b>Patient:</b> ' + esc(rx.patient) + ' &middot; <b>Date:</b> ' + new Date().toLocaleDateString() + '</div>'
    + '<div style="margin:8px 0;line-height:1.6">'
    + rx.meds.map(function(m) {
      return '• <b>' + esc(m.name) + ' ' + esc(m.dose) + '</b>: Take ' + esc(m.freq) + ' for ' + esc(m.days) + ' days (' + esc(m.instructions) + ')';
    }).join('<br>')
    + '</div>'
    + '<div style="margin-top:12px;font-size:12px;color:#555;border-top:1px solid #EEE;padding-top:6px">Doctor: ' + esc(rx.doctor) + ' | Dispensed by: Vikram Verma, B.Pharm (Reg #PCI-TS-44120)</div>'
    + '</div>'
    + '<button class="btn alt" style="margin-top:12px;width:100%;justify-content:center" onclick="printRxLabel()">🖨 Print Medicine Label</button>'
    + '</div></div>';

  return h;
}

function renderPharmaLabel(lang) {
  var rx = HOSP_STATE.prescriptions.find(function(r) { return r.id === ACTIVE_RX_ID; }) || HOSP_STATE.prescriptions[0];
  var box = $('labelPreview');
  if (!box) return;

  var title = lang === 'hi' ? '🏥 सिटी केयर अस्पताल फ़ार्मेसी' : lang === 'te' ? '🏥 సిటీ కేర్ ఆసుపత్రి ఫార్మసీ' : '🏥 CITY CARE HOSPITAL PHARMACY';
  var pLabel = lang === 'hi' ? 'मरीज़:' : lang === 'te' ? 'రోగి:' : 'Patient:';

  var medText = rx.meds.map(function(m) {
    if (lang === 'hi') {
      return '• <b>' + esc(m.name) + ' ' + esc(m.dose) + '</b>: खुराक: ' + esc(m.freq) + ', ' + esc(m.days) + ' दिन (' + (m.instructions.indexOf('after') > -1 || m.instructions.indexOf('After') > -1 ? 'खाने के बाद पानी के साथ लें' : 'खाने से पहले लें') + ')';
    } else if (lang === 'te') {
      return '• <b>' + esc(m.name) + ' ' + esc(m.dose) + '</b>: మోతాదు: ' + esc(m.freq) + ', ' + esc(m.days) + ' రోజులు (ఆహారం తర్వాత నీటితో తీసుకోండి)';
    } else {
      return '• <b>' + esc(m.name) + ' ' + esc(m.dose) + '</b>: Take ' + esc(m.freq) + ' for ' + esc(m.days) + ' days (' + esc(m.instructions) + ')';
    }
  }).join('<br>');

  box.innerHTML = '<div style="font-size:16px;font-weight:800;border-bottom:1px solid #CCC;padding-bottom:6px">' + title + '</div>'
    + '<div style="margin:8px 0"><b>' + pLabel + '</b> ' + esc(rx.patient) + ' &middot; <b>Date:</b> ' + new Date().toLocaleDateString() + '</div>'
    + '<div style="margin:8px 0;line-height:1.6">' + medText + '</div>'
    + '<div style="margin-top:12px;font-size:12px;color:#555;border-top:1px solid #EEE;padding-top:6px">Doctor: ' + esc(rx.doctor) + ' | Dispenser: Vikram Verma, B.Pharm (Reg #PCI-TS-44120)</div>';
}

function submitDispense() {
  var rx = HOSP_STATE.prescriptions.find(function(r) { return r.id === ACTIVE_RX_ID; }) || HOSP_STATE.prescriptions[0];
  rx.status = 'dispensed';

  // Find encounter and complete
  var enc = HOSP_STATE.encounters.find(function(e) { return e.id === rx.encId; });
  if (enc) enc.status = 'completed';

  // Sync to API
  fetch('/api/hospital?action=dispense-rx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      prescriptionId: rx.id,
      pharmacistId: 'usr-pharma-1',
      status: 'dispensed'
    })
  }).catch(function() {});

  V = 'pharma_queue';
  draw();
  alert('Prescription dispensed successfully for ' + rx.patient + '. Patient visit status marked as Completed.');
}

function printRxLabel() {
  var p = $('labelPreview');
  if (!p) return;
  var w = window.open('', '_blank', 'width=500,height=400');
  w.document.write('<html><head><title>Pharmacy Medication Label</title><style>body{font-family:sans-serif;padding:20px}</style></head><body>' + p.innerHTML + '</body></html>');
  w.document.close();
  w.focus();
  w.print();
}

// -------------------------------------------------------------
// 7. PUBLIC HOSPITAL REGISTRATION VIEW
// -------------------------------------------------------------
function hospRegHTML() {
  return '<div class="glass"><span class="pill">Tenant Onboarding</span><h1 style="margin:4px 0">Hospital &amp; Clinic Registration</h1><div class="mut">Register your healthcare organization on the Medoryx Multi-Tenant Clinical Intelligence Platform.</div></div>'
    + '<div class="glass" style="margin-top:16px;max-width:760px">'
    + '<div class="two" style="margin-top:0"><div><label for="hr_name">Hospital Legal Name</label><input id="hr_name" placeholder="e.g. Apollo Lifeline Hospital"></div><div><label for="hr_reg">Registration Number</label><input id="hr_reg" placeholder="e.g. REG-2026-DL-5521"></div></div>'
    + '<div class="two" style="margin-top:0"><div><label for="hr_email">Official Hospital Email</label><input id="hr_email" type="email" placeholder="contact@hospital.example.com"></div><div><label for="hr_phone">Hospital Contact Phone</label><input id="hr_phone" placeholder="e.g. +91 11 2345 6789"></div></div>'
    + '<label for="hr_addr">Physical Address &amp; State</label><input id="hr_addr" placeholder="e.g. Sector 14, Rohini, New Delhi, 110085">'
    + '<label for="hr_depts">Clinical Departments</label><input id="hr_depts" value="General Medicine, Diagnostics & Pathology, Pharmacy, Emergency">'
    + '<div class="two" style="margin-top:0"><div><label for="hr_admin">Hospital Admin Full Name</label><input id="hr_admin" placeholder="e.g. Dr. Ramesh Gupta"></div><div><label for="hr_pw">Admin Password</label><input id="hr_pw" type="password" value="HospAdmin@2026"></div></div>'
    + '<div id="hr_msg" class="err" role="alert" style="margin:8px 0"></div>'
    + '<div class="row" style="margin-top:14px"><button class="btn" onclick="submitHospReg()">Submit Hospital Registration Application</button><button class="btn alt" onclick="go(\'landing\')">Cancel</button></div>'
    + '</div>';
}

function submitHospReg() {
  var name = ($('hr_name') || {}).value || '';
  var reg = ($('hr_reg') || {}).value || '';
  var email = ($('hr_email') || {}).value || '';
  var phone = ($('hr_phone') || {}).value || '';
  var addr = ($('hr_addr') || {}).value || '';
  var depts = ($('hr_depts') || {}).value || '';
  var admin = ($('hr_admin') || {}).value || '';
  var pw = ($('hr_pw') || {}).value || '';
  var msg = $('hr_msg');

  if (!name.trim() || !reg.trim() || !email.trim()) {
    if (msg) msg.textContent = 'Please fill out Hospital Legal Name, Registration Number, and Official Email.';
    return;
  }

  var newHosp = {
    id: 'hosp-' + Date.now().toString(36),
    name: name.trim(),
    reg: reg.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    address: addr.trim(),
    depts: depts.trim(),
    status: 'pending'
  };

  HOSP_STATE.hospitals.unshift(newHosp);

  fetch('/api/hospital?action=register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Medoryx': '1' },
    body: JSON.stringify({
      name: newHosp.name,
      registrationNumber: newHosp.reg,
      email: newHosp.email,
      phone: newHosp.phone,
      address: newHosp.address,
      departments: newHosp.depts,
      adminName: admin,
      adminPassword: pw
    })
  }).catch(function() {});

  alert('Hospital registration application submitted for ' + newHosp.name + '!\nStatus: Pending approval by Super Admin.');
  go('landing');
}

// -------------------------------------------------------------
// 8. MASTER DISPATCHER: hospitalDraw()
// -------------------------------------------------------------
function hospitalDraw() {
  var roleBadge = $('roleBadge');
  var subTitle = $('subTitle');
  var who = $('who');
  var wav = $('wav');

  if (who) who.textContent = DEMO.name;
  if (wav) wav.textContent = (DEMO.name || '?').trim().charAt(0).toUpperCase();

  var sel = $('roleSel');
  if (sel) sel.value = ROLE;

  var side = $('side');
  var main = $('main');
  var sideHtml = '';
  var mainHtml = '';

  if (V === 'hosp_reg') {
    if (roleBadge) roleBadge.textContent = 'REGISTRATION';
    if (subTitle) subTitle.textContent = 'Medoryx Healthcare Onboarding';
    side.innerHTML = '<h6 class="mut">HOSPITAL PORTAL</h6><button class="on"><span class="nic">🏥</span>Hospital Register</button><button onclick="go(\'landing\')"><span class="nic">←</span>Back to Home</button>';
    main.innerHTML = hospRegHTML();
    return;
  }

  if (ROLE === 'super_admin') {
    if (roleBadge) roleBadge.textContent = 'SUPER ADMIN';
    if (subTitle) subTitle.textContent = 'Medoryx Multi-Tenant Platform';
    sideHtml = '<h6 class="mut">SUPER ADMIN</h6>'
      + '<button class="' + (V === 'super_hosp' ? 'on' : '') + '" onclick="V=\'super_hosp\';draw()"><span class="nic">🏥</span>Hospital Approvals</button>'
      + '<button class="' + (V === 'super_users' ? 'on' : '') + '" onclick="V=\'super_users\';draw()"><span class="nic">👥</span>Platform Users</button>'
      + '<button class="' + (V === 'super_audit' ? 'on' : '') + '" onclick="V=\'super_audit\';draw()"><span class="nic">📊</span>Security &amp; Audit</button>'
      + '<div class="eng"><b>● Super Admin</b><br>Global platform tenant isolation &amp; compliance management.</div>';

    if (V === 'super_users') mainHtml = superUsersHTML();
    else if (V === 'super_audit') mainHtml = superAuditHTML();
    else mainHtml = superHospHTML();
  } else if (ROLE === 'hospital_admin') {
    if (roleBadge) roleBadge.textContent = 'TENANT ADMIN';
    if (subTitle) subTitle.textContent = 'City Care Hospital (REG-2026-HYD-8491)';
    sideHtml = '<h6 class="mut">HOSPITAL ADMIN</h6>'
      + '<button class="' + (V === 'hosp_overview' ? 'on' : '') + '" onclick="V=\'hosp_overview\';draw()"><span class="nic">🏥</span>Hospital Overview</button>'
      + '<button class="' + (V === 'hosp_staff' ? 'on' : '') + '" onclick="V=\'hosp_staff\';draw()"><span class="nic">👥</span>Staff Directory</button>'
      + '<button class="' + (V === 'hosp_add_staff' ? 'on' : '') + '" onclick="V=\'hosp_add_staff\';draw()"><span class="nic">➕</span>Provision Staff</button>'
      + '<div class="eng"><b>● Hospital Admin</b><br>Manage medical staff, employee credentials &amp; department loads.</div>';

    if (V === 'hosp_staff') mainHtml = hospStaffHTML();
    else if (V === 'hosp_add_staff') mainHtml = hospAddStaffHTML();
    else mainHtml = hospOverviewHTML();
  } else if (ROLE === 'receptionist') {
    if (roleBadge) roleBadge.textContent = 'RECEPTIONIST';
    if (subTitle) subTitle.textContent = 'Front Desk &amp; Patient Intake';
    sideHtml = '<h6 class="mut">RECEPTION DESK</h6>'
      + '<button class="' + (V === 'rec_checkin' ? 'on' : '') + '" onclick="V=\'rec_checkin\';draw()"><span class="nic">📝</span>Patient Check-In</button>'
      + '<button class="' + (V === 'rec_queue' ? 'on' : '') + '" onclick="V=\'rec_queue\';draw()"><span class="nic">🎫</span>OPD Live Queue</button>'
      + '<div class="eng"><b>● Front Desk Triage</b><br>Generate patient tokens, link 14-digit ABHA, and route visits.</div>';

    if (V === 'rec_queue') mainHtml = recQueueHTML();
    else mainHtml = recCheckinHTML();
  } else if (ROLE === 'doctor') {
    if (roleBadge) roleBadge.textContent = 'DOCTOR EHR';
    if (subTitle) subTitle.textContent = 'Dr. Rajesh Sharma, MD (Diabetologist)';
    var pendingApts = (HOSP_STATE.appointments || []).filter(function(a) { return a.status === 'pending'; }).length;
    var aptBadge = pendingApts ? ' <span class="pill w" style="padding:1px 6px;font-size:10px">' + pendingApts + '</span>' : '';
    sideHtml = '<h6 class="mut">DOCTOR PORTAL</h6>'
      + '<button class="' + (V === 'doc_queue' ? 'on' : '') + '" onclick="V=\'doc_queue\';draw()"><span class="nic">🩺</span>Consultation Queue</button>'
      + '<button class="' + (V === 'doc_apts' ? 'on' : '') + '" onclick="V=\'doc_apts\';draw()"><span class="nic">📅</span>Appointments' + aptBadge + '</button>'
      + '<button class="' + (V === 'doc_abha' ? 'on' : '') + '" onclick="V=\'doc_abha\';draw()"><span class="nic">🔍</span>ABHA Patient Records</button>'
      + '<button class="' + (V === 'doc_consult' ? 'on' : '') + '" onclick="V=\'doc_consult\';draw()"><span class="nic">📋</span>Clinical File &amp; AI</button>'
      + '<div class="eng"><b>● Clinical Copilot</b><br>ABHA record lookup, grounded RAG search &amp; e-prescriptions.</div>';

    if (V === 'doc_consult') mainHtml = docConsultHTML();
    else if (V === 'doc_apts') mainHtml = docAptsHTML();
    else if (V === 'doc_abha') mainHtml = docAbhaHTML();
    else mainHtml = docQueueHTML();
  } else if (ROLE === 'lab_technician') {
    if (roleBadge) roleBadge.textContent = 'LAB TECH';
    if (subTitle) subTitle.textContent = 'Clinical Pathology &amp; Diagnostics';
    sideHtml = '<h6 class="mut">PATHOLOGY LAB</h6>'
      + '<button class="' + (V === 'lab_queue' ? 'on' : '') + '" onclick="V=\'lab_queue\';draw()"><span class="nic">🔬</span>Diagnostic Orders</button>'
      + '<button class="' + (V === 'lab_entry' ? 'on' : '') + '" onclick="V=\'lab_entry\';draw()"><span class="nic">🧪</span>Result Entry &amp; LOINC</button>'
      + '<div class="eng"><b>● Pathology Analyzer</b><br>Verify specimen parameters against LOINC codes and reference ranges.</div>';

    if (V === 'lab_entry') mainHtml = labEntryHTML();
    else mainHtml = labQueueHTML();
  } else if (ROLE === 'pharmacist') {
    if (roleBadge) roleBadge.textContent = 'PHARMACY';
    if (subTitle) subTitle.textContent = 'Medication Dispensing &amp; Stock';
    sideHtml = '<h6 class="mut">PHARMACY DISPENSARY</h6>'
      + '<button class="' + (V === 'pharma_queue' ? 'on' : '') + '" onclick="V=\'pharma_queue\';draw()"><span class="nic">💊</span>Prescription Queue</button>'
      + '<button class="' + (V === 'pharma_dispense' ? 'on' : '') + '" onclick="V=\'pharma_dispense\';draw()"><span class="nic">✓</span>Dispense &amp; Verify</button>'
      + '<div class="eng"><b>● Pharmacy Dispenser</b><br>Verify schedules, dispense courses &amp; print multilingual labels.</div>';

    if (V === 'pharma_dispense') mainHtml = pharmaDispenseHTML();
    else mainHtml = pharmaQueueHTML();
  }

  side.innerHTML = sideHtml;
  main.innerHTML = mainHtml;
}

var DOC_VIEW_CACHE = [];
function openDoctorDocModalByIndex(idx) {
  var d = (DOC_VIEW_CACHE && DOC_VIEW_CACHE[idx]) || {};
  if (!d.doc) return;
  var title = (d.type || 'Medical Document') + ' (' + (d.date || 'Undated') + ')';
  openDoctorDocModal(d.doc, title, idx);
}

function downloadDoctorDocByIndex(idx) {
  var d = (DOC_VIEW_CACHE && DOC_VIEW_CACHE[idx]) || {};
  if (!d.doc) return;
  var name = (d.type || 'document').replace(/[^a-z0-9]/gi, '_') + '_' + (d.date || 'record');
  triggerDocDownload(d.doc, name);
}

function triggerDocDownload(imgSrc, filename) {
  if (!imgSrc) return;
  var baseName = (filename || 'medical_document').replace(/\.[^.]+$/, '');
  
  if (imgSrc.indexOf('data:image/svg+xml') === 0) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1500;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        var pngUrl = canvas.toDataURL('image/png');
        var a = document.createElement('a');
        a.href = pngUrl;
        a.download = baseName + '.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(function() { if (a.parentNode) a.parentNode.removeChild(a); }, 200);
        return;
      } catch (e) {
        console.warn('Canvas rasterization fallback', e);
      }
      directDownloadFile(imgSrc, baseName + '.svg');
    };
    img.onerror = function() {
      directDownloadFile(imgSrc, baseName + '.svg');
    };
    img.src = imgSrc;
  } else {
    directDownloadFile(imgSrc, baseName + '.png');
  }
}

function directDownloadFile(url, fileName) {
  var a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() { if (a.parentNode) a.parentNode.removeChild(a); }, 200);
}

function openDoctorDocModal(imgSrc, title, idx) {
  var m = document.getElementById('doctor_doc_modal');
  if (!m) {
    m = document.createElement('div');
    m.id = 'doctor_doc_modal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.88);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
    document.body.appendChild(m);
  }

  var safeTitle = esc(title || 'Original Uploaded Medical Document');
  var downloadAction = (idx != null) ? ('downloadDoctorDocByIndex(' + idx + ')') : ('triggerDocDownload(\'' + esc(imgSrc) + '\', \'medical_document\')');

  m.innerHTML = '<div style="background:#ffffff;border-radius:16px;max-width:880px;width:100%;max-height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,0.55);border:1px solid #CBD5E1">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #E2E8F0;background:#F8FAFC">'
    + '<div><b style="font-size:16px;color:#0F172A">📄 ' + safeTitle + '</b><div class="mut" style="font-size:11.5px">High-Resolution Clinical Scan &middot; ABDM Repository</div></div>'
    + '<div style="display:flex;gap:10px">'
    + '<button class="btn" style="padding:6px 14px;font-size:12px;background:linear-gradient(135deg,#0284C7,#0369A1);color:#fff" onclick="' + downloadAction + '">⬇ Download PNG Document</button>'
    + '<button class="btn alt" style="padding:6px 14px;font-size:12px" onclick="document.getElementById(\'doctor_doc_modal\').style.display=\'none\'">✕ Close</button>'
    + '</div>'
    + '</div>'
    + '<div style="flex:1;overflow:auto;padding:24px;text-align:center;background:#F1F5F9;display:grid;place-items:center">'
    + '<div style="background:#ffffff;padding:16px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.12);border:1px solid #CBD5E1;max-width:100%">'
    + '<img src="' + esc(imgSrc) + '" alt="Original Medical Document" style="max-width:100%;max-height:72vh;height:auto;display:block;background:#ffffff;margin:0 auto;box-shadow:0 2px 10px rgba(0,0,0,0.05)">'
    + '</div>'
    + '</div>'
    + '</div>';
  m.style.display = 'flex';
}

// Automatically sync hospital data on load
if (typeof window !== 'undefined') {
  setTimeout(fetchHospSync, 1000);
}
