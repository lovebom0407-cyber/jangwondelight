import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sorting from '../netlify/functions/sorting.mts';
import portfolio from '../netlify/functions/portfolio.mts';
import { MAX_PDF_BYTES } from '../src/services/driveSubmission';

const origin = 'https://jangwon-example.netlify.app';
const request = (path: string, body: unknown, extra = {}) => new Request(origin + path, {
  method: 'POST', headers: { Origin: origin, ...extra }, body: JSON.stringify(body),
});
const sorted = await sorting(request('/api/sorting', { name: '배포검증', previousHouse: 2 }));
assert.equal(sorted.status, 200);
assert.equal((await sorted.json()).house, 2);
assert.equal((await sorting(new Request(origin + '/api/sorting'))).status, 405);
assert.equal((await sorting(request('/api/sorting', {}, { Origin: 'https://other.example' }))).status, 403);
assert.equal(MAX_PDF_BYTES, 4 * 1024 * 1024);
assert.equal((await portfolio(request('/api/portfolio', {}, { 'Content-Length': '6000000' }))).status, 413);
assert.equal((await portfolio(request('/api/portfolio', { requestId: 'invalid' }))).status, 400);

const id = 'e'.repeat(64), originalFetch = globalThis.fetch;
let saved = false, posts = 0;
globalThis.fetch = (async (input, init) => {
  assert.ok(String(input).startsWith('https://script.google.com/macros/s/'));
  if (init?.method === 'POST') {
    const payload = JSON.parse(String(init.body));
    assert.equal(payload.requestId, id); assert.equal(init.redirect, 'manual');
    saved = true; posts++;
    throw Error('Simulated lost response after save');
  }
  const url = new URL(String(input)), callback = url.searchParams.get('callback');
  return new Response(callback + '(' + JSON.stringify({ requestId: id, state: saved ? 'saved' : 'unknown', version: 3 }) + ');');
}) as typeof fetch;
try {
  assert.equal((await (await portfolio(request('/api/portfolio', { action: 'status', requestId: id }))).json()).state, 'unknown');
  const upload = await portfolio(request('/api/portfolio', {
    v: 1, requestId: id, fileName: '검증초등학교_3학년_1반_배포검증.pdf', mimeType: 'application/pdf',
    base64: Buffer.from('%PDF-1.4\n%%EOF').toString('base64'),
  }));
  assert.equal((await upload.json()).state, 'pending'); assert.equal(posts, 1);
  assert.equal((await (await portfolio(request('/api/portfolio', { action: 'status', requestId: id }))).json()).state, 'saved');
  assert.equal(upload.headers.get('Access-Control-Allow-Origin'), null);
} finally { globalThis.fetch = originalFetch; }

const redirects = await readFile('public/_redirects', 'utf8');
assert.ok(redirects.indexOf('/api/portfolio') < redirects.indexOf('/* /index.html'));
const config = await readFile('netlify.toml', 'utf8');
assert.ok(config.includes('publish = "dist"'));
assert.ok(config.includes('directory = "netlify/functions"'));
assert.ok(!config.includes('api_key'));
console.log('PASS: Netlify handlers preserve sorting, PDF receipts, origin checks, upload limits and API-before-SPA routing; all remote calls mocked');
