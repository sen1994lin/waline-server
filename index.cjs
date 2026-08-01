// Waline 留言墙 Vercel 服务端
//
// 三层修复（之前已经分别验证过）：
//   1. 分片域名数组（think-mongo 不会自动发现副本集名，必须显式指定）
//   2. replicaSet = atlas-9o2cm8-shard-0（让 driver 走副本集模式）
//   3. tls=true + authSource=admin（Atlas 强制）
//   4. W=1（不等 majority，避开 shard-00-02 限流后凑不齐 majority 的死锁）
//   5. 短 serverSelection/socket/connect timeout（Vercel 函数 10s maxDuration 内必须快）
//
// 第六层修复在 package.json postinstall（scripts/patch-think-mongo.cjs）：
//   把 think-mongo 默认 acquireTimeoutMillis 3000 -> 20000
//   这是 Vercel 函数冷启动 + Atlas 副本集拓扑探测 5 秒撞墙的根因

process.env.MONGO_HOST = JSON.stringify([
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
]);
process.env.MONGO_PORT = JSON.stringify([27017, 27017, 27017]);
process.env.MONGO_REPLICASET = 'atlas-9o2cm8-shard-0';
process.env.MONGO_OPT_TLS = 'true';
process.env.MONGO_OPT_AUTH_SOURCE = 'admin';
process.env.MONGO_OPT_RETRYWRITES = 'true';
// 关键：写只等 primary 确认，避开 unreachable 的 shard-00-02
process.env.MONGO_OPT_W = '1';
// 防御性 client 超时
process.env.MONGO_OPT_SERVERSELECTIONTIMEOUTMS = '3000';
process.env.MONGO_OPT_SOCKETTIMEOUTMS = '5000';
process.env.MONGO_OPT_CONNECTTIMEOUTMS = '3000';

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
