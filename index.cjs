// Waline 留言墙 Vercel 服务端
// 关键修复：think-mongo 用 mongodb:// 拼 URI 不会自动发现副本集名，必须显式指定
// Atlas Cluster0 副本集名：atlas-9o2cm8-shard-0

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
process.env.MONGO_OPT_W = 'majority';

const Application = require('@waline/vercel');
const walineHandler = Application({
  plugins: [],
  async postSave(comment) {},
});

// VERSION_TAG 是部署时刻戳；用 module load 时的固定值证明新代码在跑
const VERSION_TAG = 'WALINE-FIX-2026-08-01-RC1';

module.exports = async (req, res) => {
  const u = (req.url || '').split('?')[0];
  if (u === '/version' || u === '/api/version') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      version: VERSION_TAG,
      commit: process.env.VERCEL_GIT_COMMIT_SHA,
      deployment: process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.VERCEL_REGION,
      time: new Date().toISOString(),
    }, null, 2));
    return;
  }
  return walineHandler(req, res);
};
