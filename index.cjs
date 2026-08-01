// ── Atlas MongoDB 连接修正（关键）──
// 问题根因：Waline 依赖的 think-mongo（lib/socket.js:61）写死 `mongodb://` scheme 拼接连接串，
// 而 Atlas 的「集群主域名」(cluster0.xxxx.mongodb.net) 只有 SRV 记录、没有 A 记录，
// 导致默认 mongodb://user:pass@cluster0.xxxx:27017 解析失败 → 读写全部 500。
// 解决：改用 Atlas 集群的 3 个「分片域名」（它们有 A 记录，且位于 AWS us-east-1，与 Vercel 同区）。
// ⚠️ 若将来重建集群，分片域名会变化，需同步更新下面这 3 行。
process.env.MONGO_HOST = JSON.stringify([
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
]);
process.env.MONGO_PORT = JSON.stringify([27017, 27017, 27017]);

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
