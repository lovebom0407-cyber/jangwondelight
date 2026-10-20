// Exercises actual guardian controls with a configured endpoint and controlled transport.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<div id="root"></div>', { url: 'https://event.test' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent', 'FileReader']) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react'); const { act } = React; const { createRoot } = await import('react-dom/client');
const bundle = new URL('./.drive-ui-bundle.mjs', import.meta.url);
const output = await build({ stdin: { contents: "export {DriveSubmissionPanel} from './src/components/DriveSubmissionPanel';export {createBlankState} from './src/services/storage';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', packages: 'external', write: false, plugins: [{ name: 'configured-test-endpoint', setup(b) { b.onResolve({ filter: /driveUploadConfig$/ }, () => ({ path: 'endpoint', namespace: 'test-config' })); b.onLoad({ filter: /.*/, namespace: 'test-config' }, () => ({ contents: "export const DRIVE_UPLOAD_ENDPOINT='https://script.google.com/macros/s/EXAMPLE_TEST/exec'" })); } }] });
await writeFile(bundle, output.outputFiles[0].text);
const { DriveSubmissionPanel, createBlankState } = await import(bundle);
let posts = 0, makes = 0, consent = false, gate;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url,options) => { assert.equal(url,'/api/portfolio');const body=JSON.parse(options.body);assert.equal(consent,true);if(body.action==='status')return {ok:true,json:async()=>({requestId:body.requestId,state:posts?'saved':'unknown',version:3})};posts++;return {ok:true,json:async()=>({requestId:body.requestId,state:'pending',version:3})}; };
let participant = { ...createBlankState(), name: '제출확인학생', completed: [0, 1, 2, 3, 4, 5, 6] };
let count = 7;
const pdf = new dom.window.Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' });
function Harness() { const [busy, setBusy] = React.useState(false); return React.createElement(DriveSubmissionPanel, { state: participant, photoCount: count, busy, onBusyChange: setBusy, makePdf: async () => { makes++; if (gate) await gate; return pdf; } }); }
let root = createRoot(document.getElementById('root'));
const button = () => document.querySelector('button');
const click = el => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const render = () => act(async () => root.render(React.createElement(Harness)));
try {
  await render(); assert.equal(button().disabled, true); assert.equal(posts, 0); assert.equal(makes, 0);
  consent = true; await click(document.querySelector('input')); assert.equal(button().disabled, false);
  let release; gate = new Promise(r => release = r);
  await act(async () => { button().dispatchEvent(new MouseEvent('click', { bubbles: true })); button().dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  // Hashing may resolve after the React microtask turn.
  await act(async () => new Promise(r => setImmediate(r)));
  assert.equal(makes, 1); assert.equal(button().disabled, true); assert.equal(posts, 0);
  await act(async () => { release(); await new Promise(r => setTimeout(r, 30)); }); gate = null;
  assert.equal(posts, 1); assert.ok(document.body.textContent.includes('제출 완료!')); assert.equal(button().disabled, true);
  participant = { ...participant, reflection: { family: '수정된 소감' } }; await render();
  assert.equal(document.querySelector('input').checked, false); assert.equal(button().disabled, true);
  count = 6; await render(); await click(document.querySelector('input')); assert.equal(button().disabled, true); assert.equal(posts, 1);
  console.log('PASS: consent required; double tap generates/transmits once; saved receipt required; edited content requires new consent; missing photo blocks submit');
  await act(async () => root.unmount()); root = createRoot(document.getElementById('root')); posts = 0; makes = 0; count = 7;
  gate = new Promise(r => release = r); await render(); await click(document.querySelector('input')); await click(button());
  await act(async () => new Promise(r => setImmediate(r))); await act(async () => root.unmount());
  await act(async () => release()); assert.equal(posts, 0);
  console.log('PASS: leaving during PDF generation cancels transmission');
} finally { globalThis.fetch = originalFetch; await unlink(bundle).catch(() => {}); dom.window.close(); }
