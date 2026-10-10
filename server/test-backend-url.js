// Unit check for lib/backend-url.ts (Node strips the TS types). Run: node server/test-backend-url.js
import assert from 'assert';
import { getBackendUrl } from '../lib/backend-url.ts';
const set = (env, url) => { process.env.NODE_ENV = env; delete process.env.BACKEND_SERVICE_URL; delete process.env.BACKEND_URL; delete process.env.NEXT_PUBLIC_API_URL; if (url !== undefined) process.env.BACKEND_URL = url; };
set('production', 'https://api.example.com/api/'); assert.equal(getBackendUrl(), 'https://api.example.com'); // no /api/api
set('production', 'https://api.example.com'); assert.equal(getBackendUrl(), 'https://api.example.com');
// Vercel service binding injection via BACKEND_SERVICE_URL
process.env.BACKEND_SERVICE_URL = 'https://api.example.com/api'; assert.equal(getBackendUrl(), 'https://api.example.com');
delete process.env.BACKEND_SERVICE_URL;
set('production'); assert.equal(getBackendUrl(), null);                                // missing
set('production', 'http://localhost:5001'); assert.equal(getBackendUrl(), null);       // localhost
set('production', 'http://127.0.0.1:5001/api'); assert.equal(getBackendUrl(), null);
set('development'); assert.equal(getBackendUrl(), 'http://localhost:5001');             // dev default only
console.log('backend-url OK');
