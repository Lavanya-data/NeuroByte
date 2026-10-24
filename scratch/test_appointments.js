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

async function testWorkflow() {
  console.log('=== Step 1: Patient Books Appointment with Doctor ===');
  const bookRes = await post('book-appointment', {
    hospitalId: 'hosp-001',
    doctorId: 'usr-doc-1',
    patientName: 'Sunita Mehra',
    patientEmail: 'sunita.patient@example.com',
    patientPhone: '+91 98490 99887',
    patientAge: '39',
    patientGender: 'female',
    date: '2026-10-27',
    timeSlot: '10:15 AM',
    reason: 'Follow-up on abnormal thyroid levels and fatigue',
    notes: 'Please review previous TSH report.'
  });
  console.log('Book appointment result:', bookRes.status === 200 ? 'PASS' : 'FAIL', bookRes.data?.message);
  const aptId = bookRes.data?.appointment?.id;
  console.log('Created Appointment ID:', aptId);

  console.log('\n=== Step 2: Doctor Fetches Pending Appointments ===');
  const docAptsRes = await get('appointments&doctorId=usr-doc-1');
  const pending = docAptsRes.data.appointments.find(a => a.id === aptId);
  console.log('Doctor finds pending appointment:', pending && pending.status === 'pending' ? 'PASS' : 'FAIL', pending?.reason);

  console.log('\n=== Step 3: Doctor Accepts Appointment ===');
  const acceptRes = await post('accept-appointment', {
    appointmentId: aptId,
    doctorNotes: 'Confirmed for OPD Room 101. Fasting not required for thyroid consult.'
  });
  console.log('Doctor accept result:', acceptRes.status === 200 ? 'PASS' : 'FAIL', acceptRes.data?.appointment?.status);
  console.log('Doctor notes saved:', acceptRes.data?.appointment?.doctorNotes);

  console.log('\n=== Step 4: Patient Verifies Confirmed Appointment ===');
  const patAptsRes = await get('appointments&patientEmail=sunita.patient@example.com');
  const patApt = patAptsRes.data.appointments.find(a => a.id === aptId);
  console.log('Patient sees accepted status:', patApt && patApt.status === 'accepted' ? 'PASS' : 'FAIL', patApt?.status);

  console.log('\n=== Step 5: Check-In Scheduled Patient to Live OPD Queue ===');
  const checkinRes = await post('checkin-appointment', { appointmentId: aptId });
  console.log('Check-in result:', checkinRes.status === 200 ? 'PASS' : 'FAIL', checkinRes.data?.message);
  console.log('Encounter Token assigned:', '#' + checkinRes.data?.encounter?.tokenNumber, 'Status:', checkinRes.data?.encounter?.status);
}

testWorkflow().catch(console.error);
