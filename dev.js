// Local development server for Medoryx
// Runs natively with Node.js. No Vercel CLI, npm install, or administrator rights required.
// Run with: node dev.js

const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if present
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(l => {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
  console.log('✓ Loaded .env.local');
}

const PORT = 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost:3000';
  let pathname;
  try {
    const parsedUrl = new URL(req.url, `http://${host}`);
    pathname = parsedUrl.pathname;
    req.query = Object.fromEntries(parsedUrl.searchParams.entries());
  } catch (e) {
    pathname = req.url;
    req.query = {};
  }

  // Helper response methods for compatibility with Vercel serverless functions
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json');
    this.end(JSON.stringify(data));
  };

  // 1. API Route Handling: /api/:name
  if (pathname.startsWith('/api/')) {
    const endpoint = pathname.slice(5).replace(/\.js$/, '');
    const apiFile = path.join(__dirname, 'api', `${endpoint}.js`);

    if (!fs.existsSync(apiFile)) {
      return res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
    }

    // Allow check-setup.js and local curl to test the API without browser headers
    if (!req.headers['x-medoryx'] && !req.headers.origin && (!req.headers.referer || req.headers.referer.includes('localhost'))) {
      req.headers['x-medoryx'] = '1';
    }

    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch (e) {
        req.body = {};
      }

      try {
        // Clear require cache during development
        delete require.cache[require.resolve(apiFile)];
        const handler = require(apiFile);
        await handler(req, res);
      } catch (err) {
        console.error(`Error in /api/${endpoint}:`, err);
        if (!res.writableEnded) {
          res.status(500).json({ error: err.message || 'Internal server error', code: 'SERVER_ERROR' });
        }
      }
    });
    return;
  }

  // 2. Static File Serving
  let filePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const absPath = path.join(__dirname, filePath);

  if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
    const ext = path.extname(absPath).toLowerCase();
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    fs.createReadStream(absPath).pipe(res);
  } else {
    res.statusCode = 404;
    res.end('File not found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n===========================================`);
  console.log(`  Medoryx is running!`);
  console.log(`  Open in your browser: http://localhost:${PORT}`);
  console.log(`===========================================\n`);
});
