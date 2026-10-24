const http = require('http');

function post(action, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/hospital?action=' + action,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Medoryx': '1',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(action) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/hospital?action=' + action,
      method: 'GET',
      headers: {
        'X-Medoryx': '1'
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Super Admin Auth ---');
  let r = await post('login', { email: 'superadmin@medoryx.example.com', password: 'WrongPassword' });
  console.log('Super Admin wrong password:', r.status === 401 ? 'PASS (rejected)' : 'FAIL', r.status);

  r = await post('login', { email: 'superadmin@medoryx.example.com', password: 'SuperAdmin@2026' });
  console.log('Super Admin correct password:', r.status === 200 && r.data.user.role === 'super_admin' ? 'PASS' : 'FAIL', r.data.user?.role);

  console.log('\n--- 2. Testing Hospital Staff Auth ---');
  r = await post('login', { email: 'dr.sharma@citycare.example.com', password: 'WrongPassword' });
  console.log('Doctor wrong password:', r.status === 401 ? 'PASS (rejected)' : 'FAIL', r.status);

  r = await post('login', { email: 'dr.sharma@citycare.example.com', password: 'StaffPass@2026' });
  console.log('Doctor correct password:', r.status === 200 && r.data.user.role === 'doctor' ? 'PASS' : 'FAIL', r.data.user?.role);

  r = await post('login', { email: 'admin@citycare.example.com', password: 'HospAdmin@2026' });
  console.log('Hospital Admin correct password:', r.status === 200 && r.data.user.role === 'hospital_admin' ? 'PASS' : 'FAIL', r.data.user?.role);

  r = await post('login', { email: 'ananya.lab@citycare.example.com', password: 'StaffPass@2026' });
  console.log('Lab Tech correct password:', r.status === 200 && r.data.user.role === 'lab_technician' ? 'PASS' : 'FAIL', r.data.user?.role);

  r = await post('login', { email: 'vikram.rx@citycare.example.com', password: 'StaffPass@2026' });
  console.log('Pharmacist correct password:', r.status === 200 && r.data.user.role === 'pharmacist' ? 'PASS' : 'FAIL', r.data.user?.role);

  r = await post('login', { email: 'priya.frontdesk@citycare.example.com', password: 'StaffPass@2026' });
  console.log('Receptionist correct password:', r.status === 200 && r.data.user.role === 'receptionist' ? 'PASS' : 'FAIL', r.data.user?.role);

  console.log('\n--- 3. Testing Privacy (No Passwords Exposed in API) ---');
  const staffRes = await get('staff');
  const staffHasPw = staffRes.data.staff.some(s => s.password !== undefined);
  console.log('Staff list exposes passwords:', staffHasPw ? 'FAIL (leaked!)' : 'PASS (no passwords exposed)');

  const usersRes = await get('users');
  const usersHasPw = usersRes.data.users.some(u => u.password !== undefined);
  console.log('Users directory exposes passwords:', usersHasPw ? 'FAIL (leaked!)' : 'PASS (no passwords exposed)');

  console.log('\n--- 4. Testing Decommissioned Nurse Role ---');
  const nurseRes = await post('create-staff', {
    hospitalId: 'hosp-001',
    fullName: 'Test Nurse',
    email: 'nurse.test@citycare.example.com',
    role: 'nurse'
  });
  console.log('Creating nurse role rejected:', nurseRes.status === 400 ? 'PASS (nurse decommissioned)' : 'FAIL', nurseRes.data?.error);
}

run().catch(console.error);
