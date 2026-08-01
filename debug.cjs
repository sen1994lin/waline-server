const dns = require('dns').promises;
const net = require('net');

function tcpTest(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    const t0 = Date.now();
    let done = false;
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => { if (!done) { done = true; sock.destroy(); resolve({ ok: true, elapsedMs: Date.now() - t0 }); } });
    sock.on('timeout', () => { if (!done) { done = true; sock.destroy(); resolve({ ok: false, error: 'timeout' }); } });
    sock.on('error', (e) => { if (!done) { done = true; sock.destroy(); resolve({ ok: false, error: e.code }); } });
  });
}

module.exports = async (req, res) => {
  const out = { at: new Date().toISOString(), steps: [] };

  // Step 1: SRV resolve
  try {
    const srv = await dns.resolveSrv('_mongodb._tcp.cluster0.qsluwd2.mongodb.net');
    out.srv = srv.map((r) => ({ name: r.name, port: r.port }));
    out.steps.push('SRV resolved: ' + srv.length + ' records');
  } catch (e) {
    out.srvError = String(e).slice(0, 300);
    out.steps.push('SRV FAILED: ' + e.code);
  }

  // Step 2: A resolve each shard
  const shards = out.srv ? out.srv.map((r) => r.name.replace(/\.$/, '')) : [
    'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
    'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
    'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
  ];
  out.aRecords = {};
  for (const h of shards) {
    try {
      out.aRecords[h] = await dns.resolve4(h);
    } catch (e) {
      out.aRecords[h] = 'ERR: ' + e.code;
    }
  }

  // Step 3: TCP connect test to each shard:27017
  out.tcp = {};
  for (const h of shards) {
    const ips = out.aRecords[h];
    if (typeof ips === 'string') { out.tcp[h] = 'skip (no A: ' + ips + ')'; continue; }
    for (const ip of ips) {
      out.tcp[h + ' (' + ip + ')'] = await tcpTest(ip, 27017, 5000);
    }
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(out, null, 2));
};
