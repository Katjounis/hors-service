import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
const r = await esbuild.build({ entryPoints: ['test/harness.jsx'], bundle: true, write: false, format: 'iife', jsx: 'automatic', jsxImportSource: 'preact', logLevel: 'warning' });
const prev = readFileSync('dist/preview.html', 'utf8');
const style = prev.slice(prev.indexOf('<style>'), prev.indexOf('</style>') + 8);
writeFileSync('dist/harness.html', `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${style}</head><body><div id="app"></div><script>${r.outputFiles[0].text}</script></body></html>`);
console.log('harness OK');
