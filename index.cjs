// ── Atlas MongoDB 连接修正（关键）──
// 问题：Waline 依赖的 think-mongo（lib/socket.js:61）写死 mongodb:// scheme 拼接连接串，
// 而 Atlas ①「集群主域名」无 A 记录（只有 SRV）② 强制要求 TLS。
// 修正：① 改用 3 个分片域名（有 A 记录）② 通过 MONGO_OPT_TLS 开启 TLS（Atlas 必需）。
process.env.MONGO_HOST = JSON.stringify([
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
]);
process.env.MONGO_PORT = JSON.stringify([27017, 27017, 27017]);
process.env.MONGO_OPT_TLS = 'true';

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
