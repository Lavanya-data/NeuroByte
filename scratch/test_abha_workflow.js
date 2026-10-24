const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Medoryx': '1'
      }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: { 'X-Medoryx': '1' }
    }, res => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(buf) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING ABHA WORKFLOW & CLINICAL RECORD LOOKUP TESTS ---');
  let failures = 0;

  // 1. Patient registers ABHA ID
  console.log('\nTest 1: Patient registers new ABHA ID...');
  const regRes = await post('/api/hospital?action=abha-register', {
    name: 'Anjali Sharma',
    age: '38',
    dob: '1988-04-12',
    gender: 'female',
    phone: '+91 98444 77889',
    email: 'anjali.s@example.com',
    abhaAddress: 'anjali.sharma@abdm'
  });
  console.log('Registration status:', regRes.status, 'Response:', JSON.stringify(regRes.data));
  if (regRes.status === 200 && regRes.data.ok && regRes.data.abha && regRes.data.abha.abhaNumber) {
    console.log('✓ PASS: Patient ABHA registered:', regRes.data.abha.abhaNumber);
  } else {
    console.error('✕ FAIL: Registration failed');
    failures++;
  }

  const generatedAbha = regRes.data.abha.abhaNumber;

  // 2. Doctor looks up patient by Ramesh Chandra ABHA ID
  console.log('\nTest 2: Doctor searches Ramesh Chandra ABHA ID (91-4829-1029-4819)...');
  const lookup1 = await get('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent('91-4829-1029-4819'));
  console.log('Lookup status:', lookup1.status, 'Patient:', lookup1.data.patient ? lookup1.data.patient.name : 'None');
  if (lookup1.status === 200 && lookup1.data.found && lookup1.data.patient.name === 'Ramesh Chandra') {
    console.log('✓ PASS: Ramesh Chandra record found!');
    console.log('  - Encounters:', lookup1.data.encounters.length);
    console.log('  - Lab Orders:', lookup1.data.labOrders.length);
    console.log('  - Prescriptions:', lookup1.data.prescriptions.length);
    if (lookup1.data.labOrders.length > 0 && lookup1.data.prescriptions.length > 0) {
      console.log('✓ PASS: Longitudinal lab results & prescriptions attached');
    } else {
      console.error('✕ FAIL: Missing lab or prescription data');
      failures++;
    }
  } else {
    console.error('✕ FAIL: Lookup 1 failed');
    failures++;
  }

  // 3. Doctor looks up Meera Deshmukh ABHA ID
  console.log('\nTest 3: Doctor searches Meera Deshmukh ABHA ID (91-1209-3381-9920)...');
  const lookup2 = await get('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent('91-1209-3381-9920'));
  console.log('Lookup status:', lookup2.status, 'Patient:', lookup2.data.patient ? lookup2.data.patient.name : 'None');
  if (lookup2.status === 200 && lookup2.data.found && lookup2.data.patient.name === 'Meera Deshmukh') {
    console.log('✓ PASS: Meera Deshmukh record found!');
  } else {
    console.error('✕ FAIL: Lookup 2 failed');
    failures++;
  }

  // 4. Doctor looks up newly generated ABHA
  console.log('\nTest 4: Doctor searches newly registered ABHA ID (' + generatedAbha + ')...');
  const lookup3 = await get('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent(generatedAbha));
  console.log('Lookup status:', lookup3.status, 'Patient:', lookup3.data.patient ? lookup3.data.patient.name : 'None');
  if (lookup3.status === 200 && lookup3.data.found && lookup3.data.patient.name === 'Anjali Sharma') {
    console.log('✓ PASS: Newly registered patient record retrieved by doctor!');
  } else {
    console.error('✕ FAIL: Lookup 3 failed');
    failures++;
  }

  // 5. Doctor searches invalid ABHA ID
  console.log('\nTest 5: Doctor searches non-existent ABHA ID (91-0000-0000-0000)...');
  const lookup4 = await get('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent('91-0000-0000-0000'));
  console.log('Lookup status:', lookup4.status, 'Error:', lookup4.data.error);
  if (lookup4.status === 404 && lookup4.data.found === false) {
    console.log('✓ PASS: Handled non-existent ABHA ID with 404 gracefully');
  } else {
    console.error('✕ FAIL: Did not return 404 for unknown ABHA');
    failures++;
  }

  console.log('\n=======================================');
  console.log('TOTAL FAILURES:', failures);
  if (failures === 0) {
    console.log('ALL ABHA WORKFLOW TESTS PASSED PERFECTLY!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
