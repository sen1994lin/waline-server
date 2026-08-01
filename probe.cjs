// Vercel-side connectivity probe (bypasses think-mongo entirely)
// Tests: ① DNS ② TCP ③ TLS handshake ④ mongo protocol ping ⑤ replica set primary
const { MongoClient } = require('mongodb');
const dns = require('dns').promises;
const net = require('net');
const https = require('https');

const SHARDS = [
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
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

module.exports = async (req, res) => {
  const log = [];
  // 1) DNS A record check (each shard)
  for (const h of SHARDS) {
    log.push(await step(`DNS A ${h}`, () => timeout(dns.resolve4(h), 5000, 'dns')));
  }
  // 2) TCP connect to each shard on 27017 (4s each)
  for (const h of SHARDS) {
    log.push(await step(`TCP ${h}:27017`, () => timeout(new Promise((res2, rej) => {
      const s = net.createConnection({ host: h, port: 27017 }, () => { s.end(); res2('connected'); });
      s.on('error', rej); s.setTimeout(3500, () => { s.destroy(new Error('tcp timeout')); });
    }), 4000, 'tcp')));
  }
  // 3) TLS handshake to each shard (using node's TLS)
  for (const h of SHARDS) {
    log.push(await step(`TLS ${h}:27017`, () => timeout(new Promise((res2, rej) => {
      const tls = require('tls');
      const s = tls.connect({ host: h, port: 27017, servername: h, rejectUnauthorized: false }, () => {
        const ok = s.authorized || s.authorizationError === undefined;
        s.end(); res2({ authorized: s.authorized, cipher: s.getCipher().name });
      });
      s.on('error', rej); s.setTimeout(4000, () => { s.destroy(new Error('tls timeout')); });
    }), 5000, 'tls')));
  }
  // 4) MongoClient ping via replica set URI (TLS, with all 3 shards)
  const hostList = SHARDS.map((h) => `${h}:27017`).join(',');
  const uri = `mongodb://${USER}:${PASS}@${hostList}/${DB}?tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=8000&connectTimeoutMS=6000&socketTimeoutMS=6000`;
  log.push(await step('MongoClient ping (replicaSet URI, TLS)', async () => {
    const c = new MongoClient(uri);
    try {
      const t0 = Date.now();
      const r = await c.db('admin').command({ ping: 1 });
      return { r, ms: Date.now() - t0 };
    } finally { await c.close(); }
  }));
  // 5) MongoClient ping via SRV URI (the standard Atlas way)
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
};
