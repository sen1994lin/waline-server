// Waline 留言墙 Vercel 服务端
// 关键修复：think-mongo 用 mongodb:// 拼 URI 不会自动发现副本集名，必须显式指定
// Atlas Cluster0 副本集名：atlas-9o2cm8-shard-0
//
// 写超时根因：之前 MONGO_OPT_W='majority' 要求写必须等 3 节点中至少 2 节点确认，
// 但 shard-00-02 从 Vercel 边缘节点不可达，5 秒内凑不齐 majority → 撞 thinkjs 资源超时
// 修法：W 改为 1（只要 primary 确认即可）+ 缩短 serverSelection / socket 超时

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
// 快速选主失败（默认 30000ms 太长）
process.env.MONGO_OPT_SERVERSELECTIONTIMEOUTMS = '3000';
// 单次操作 socket 超时（默认 0 = 无限）
process.env.MONGO_OPT_SOCKETTIMEOUTMS = '5000';
// TCP 连接超时
process.env.MONGO_OPT_CONNECTTIMEOUTMS = '3000';

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
