#!/usr/bin/env node
// Vercel build 时由 package.json postinstall 调用
// 目的：think-mongo v2.2.1 的 generic-pool acquireTimeoutMillis 默认 3000ms，
//  Vercel 函数冷启动 + Atlas 副本集连接探测经常超过 3 秒，触发
//  generic-pool 抛 "ResourceRequest timed out" → Waline 500。
// 修法：直接修改 @waline/vercel/node_modules/think-mongo/lib/socket.js
//  把 `|| 3000` 改成 `|| 20000`，给冷启动 20 秒窗口。
//
// 路径兼容性：Vercel 容器内 think-mongo 装在
//  node_modules/@waline/vercel/node_modules/think-mongo/lib/socket.js
//  （npm 嵌套依赖，不会 hoist 到根）

const fs = require('node:fs');
const path = require('node:path');

const candidates = [
  path.join(__dirname, '..', 'node_modules', '@waline', 'vercel', 'node_modules', 'think-mongo', 'lib', 'socket.js'),
  path.join(__dirname, '..', 'node_modules', 'think-mongo', 'lib', 'socket.js'),
];

let patched = false;
for (const file of candidates) {
  if (!fs.existsSync(file)) continue;
  const orig = fs.readFileSync(file, 'utf8');
  if (orig.includes('|| 20000')) {
    console.log(`[patch-think-mongo] already patched: ${file}`);
    patched = true;
    continue;
  }
  const replaced = orig.replace('|| 3000', '|| 20000');
  if (replaced === orig) {
    console.log(`[patch-think-mongo] no || 3000 found in ${file}`);
    continue;
  }
  fs.writeFileSync(file, replaced);
  console.log(`[patch-think-mongo] patched acquireTimeoutMillis 3000 -> 20000: ${file}`);
  patched = true;
}

if (!patched) {
  console.warn('[patch-think-mongo] no think-mongo socket.js found, no-op');
}
