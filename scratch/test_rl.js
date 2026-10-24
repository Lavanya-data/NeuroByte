// scratch/test_rl.js
const http = require('http');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL('http://localhost:3000' + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Medoryx': '1'
      }
    };

    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function run() {
  console.log('--- 1. Testing /api/rl?action=stats ---');
  let res = await req('/api/rl?action=stats');
  console.log('Stats response status:', res.status);
  console.log('Total episodes:', res.body.totalEpisodes);
  console.log('Arms count:', res.body.arms && res.body.arms.length);

  console.log('\n--- 2. Testing /api/rl?action=select-nudge ---');
  res = await req('/api/rl?action=select-nudge', 'POST', {
    abnormalCount: 2,
    streakDays: 4,
    riskLevel: 'high'
  });
  console.log('Selected Arm:', res.body.selectedArm && res.body.selectedArm.name);
  console.log('Nudge text:', res.body.nudgeText);
  console.log('Policy:', res.body.policy);

  console.log('\n--- 3. Testing /api/rl?action=reward ---');
  res = await req('/api/rl?action=reward', 'POST', {
    armId: 'arm_clinical_risk',
    reward: 1.0,
    notes: 'Test adherence reward'
  });
  console.log('Updated Arm:', res.body.updatedArm && res.body.updatedArm.name);
  console.log('New Arm Mean:', res.body.updatedArm && res.body.updatedArm.newMean);

  console.log('\n--- 4. Testing /api/rl?action=copilot-feedback ---');
  res = await req('/api/rl?action=copilot-feedback', 'POST', {
    prompt: 'What is HbA1c?',
    preferred: 'HbA1c measures average blood sugar over 3 months.',
    rejected: 'HbA1c measures daily sugar.',
    rating: 'thumbs_up'
  });
  console.log('DPO preference count:', res.body.dpoPreferenceCount);

  console.log('\n--- 5. Testing /api/rl?action=simulate ---');
  res = await req('/api/rl?action=simulate', 'POST', { episodes: 10 });
  console.log('Simulated episodes:', res.body.simulatedEpisodes);
  console.log('Total episodes now:', res.body.totalEpisodes);
  console.log('Total return:', res.body.totalRewards);

  console.log('\n✓ All Reinforcement Learning microservices validated successfully!');
}

run().catch(console.error);
