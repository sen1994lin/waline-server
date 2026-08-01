// Waline 留言墙 Vercel 服务端
// - 顶层覆盖 MongoDB 连接配置：必须用 Atlas 分片主机名（SRV 主域名无 A 记录）+ 强制 TLS
// - 其余 MONGO_DB/USER/PASSWORD 仍从 Vercel 环境变量读取

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

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
