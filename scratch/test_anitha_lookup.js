const http = require('http');

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
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
  console.log('Testing Doctor ABHA lookup for 91-1234-5678-9012...');
  const res = await get('/api/hospital?action=abha-lookup&abhaId=' + encodeURIComponent('91-1234-5678-9012'));
  console.log('Status:', res.status);
  console.log('Found:', res.data?.found);
  console.log('Patient Name:', res.data?.patient?.name);
  console.log('ABHA ID:', res.data?.patient?.abhaNumber);
  console.log('Lab Orders Count:', res.data?.labOrders?.length);
  console.log('Prescriptions Count:', res.data?.prescriptions?.length);
  console.log('Appointments Count:', res.data?.appointments?.length);
  
  if (res.data?.labOrders?.length > 0) {
    console.log('First Lab Order:', res.data.labOrders[0].testName, 'Results count:', res.data.labOrders[0].results?.length);
  }
  if (res.data?.prescriptions?.length > 0) {
    console.log('First Prescription Meds:', res.data.prescriptions[0].medications?.map(m => m.name));
  }
}

run().catch(console.error);
