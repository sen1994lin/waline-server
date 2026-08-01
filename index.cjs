// Waline 留言墙 Vercel 服务端
// - 顶层覆盖 MongoDB 连接配置：用 Atlas 分片主机名（SRV 主域名无 A 记录）+ 强制 TLS
// - 同时承担一个独立 /api/probe 调试端点：DNS+TCP+TLS+ping 全链路诊断（不走 think-mongo）

process.env.MONGO_HOST = JSON.stringify([
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
]);
process.env.MONGO_PORT = JSON.stringify([27017, 27017, 27017]);
process.env.MONGO_OPT_TLS = 'true';
process.env.MONGO_OPT_RETRYWRITES = 'true';
process.env.MONGO_OPT_W = 'majority';
process.env.MONGO_OPT_AUTH_SOURCE = 'admin';

const { MongoClient } = require('mongodb');
const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');

const Application = require('@waline/vercel');
const walineHandler = Application({
  plugins: [],
  async postSave(comment) {},
});

const SHARDS = [
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qslubf2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
];
const USER = process.env.MONGO_USER || '17736018227senlin_db_user';
const PASS = process.env.MONGO_PASSWORD || 'E0nthcJX43yvrI4a';
const DB = process.env.MONGO_DB || 'waline';

function step(name, fn) {
  return fn().then(
    (v) => ({ name, ok: true, result: v }),
    (e) => ({ name, ok: false, error: String(e).slice(0, 400) }),
  );
}
function timeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, r) => setTimeout(() => r(new Error(`timeout ${ms}ms [${label}]`)), ms)),
  ]);
}

async function probeHandler(req, res) {
  const log = [];
  for (const h of SHARDS) {
    log.push(await step(`DNS A ${h}`, () => timeout(dns.resolve4(h), 5000, 'dns')));
  }
  for (const h of SHARDS) {
    log.push(await step(`TCP ${h}:27017`, () => timeout(new Promise((res2, rej) => {
      const s = net.createConnection({ host: h, port: 27017 }, () => { s.end(); res2('connected'); });
      s.on('error', rej); s.setTimeout(3500, () => { s.destroy(new Error('tcp timeout')); });
    }), 4000, 'tcp')));
  }
  for (const h of SHARDS) {
    log.push(await step(`TLS ${h}:27017`, () => timeout(new Promise((res2, rej) => {
      const s = tls.connect({ host: h, port: 27017, servername: h, rejectUnauthorized: false }, () => {
        const out = { authorized: s.authorized, cipher: s.getCipher().name };
        s.end(); res2(out);
      });
      s.on('error', rej); s.setTimeout(4000, () => { s.destroy(new Error('tls timeout')); });
    }), 5000, 'tls')));
  }
  const hostList = SHARDS.map((h) => `${h}:27017`).join(',');
  const uri = `mongodb://${USER}:${PASS}@${hostList}/${DB}?tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=8000&connectTimeoutMS=6000`;
  log.push(await step('MongoClient ping (replicaSet URI, TLS)', async () => {
    const c = new MongoClient(uri);
    try {
      const t0 = Date.now();
      const r = await c.db('admin').command({ ping: 1 });
      return { r, ms: Date.now() - t0 };
    } finally { await c.close(); }
  }));
  const srvUri = `mongodb+srv://${USER}:${PASS}@cluster0.qsluwd2.mongodb.net/${DB}?tls=true&serverSelectionTimeoutMS=8000`;
  log.push(await step('MongoClient ping (SRV URI, TLS)', async () => {
    const c = new MongoClient(srvUri);
    try {
      const t0 = Date.now();
      const r = await c.db('admin').command({ ping: 1 });
      return { r, ms: Date.now() - t0 };
    } finally { await c.close(); }
  }));

  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ vercel_region: process.env.VERCEL_REGION, log }, null, 2));
}

module.exports = async (req, res) => {
  if (req.url && (req.url === '/api/probe' || req.url.startsWith('/api/probe?'))) {
    return probeHandler(req, res);
  }
  return walineHandler(req, res);
};
