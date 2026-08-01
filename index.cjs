// Waline 留言墙 Vercel 服务端
//
// 根因（已多次验证）：
//   think-mongo v2.2.1 用 generic-pool 维护 MongoClient 连接池
//   acquireTimeoutMillis 默认 3000ms (3秒)。Vercel 函数冷启动时
//   + MongoDB 副本集冷连接 + 拓扑发现 经常超过 3 秒，触发
//   generic-pool 抛 "ResourceRequest timed out"（errno 500）
//
// 修法：
//   1. 在 require '@waline/vercel' 之前 monkey-patch generic-pool.createPool
//      把 acquireTimeoutMillis 默认 3000 → 20000
//   2. 仍然 standalone 模式（删 replicaSet + 单 host），避免副本集拓扑探测
//   3. 仍然 w=1 + retryWrites=false（standalone 模式）
//   4. 防御性 client 超时

// 1) monkey-patch generic-pool（在 think-mongo 加载前）
const genericPool = require('generic-pool');
const _origCreatePool = genericPool.createPool;
genericPool.createPool = function (factory, opts) {
  opts = Object.assign({}, opts || {});
  if (!opts.acquireTimeoutMillis || opts.acquireTimeoutMillis < 20000) {
    opts.acquireTimeoutMillis = 20000; // 给冷启动 / Atlas 副本集拓扑 20 秒窗口
  }
  return _origCreatePool.call(this, factory, opts);
};

// 2) MongoDB 连接配置（standalone 模式）
process.env.MONGO_HOST = 'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net';
process.env.MONGO_PORT = '27017';
delete process.env.MONGO_REPLICASET; // standalone 不需要
process.env.MONGO_OPT_TLS = 'true';
process.env.MONGO_OPT_AUTH_SOURCE = 'admin';
process.env.MONGO_OPT_RETRYWRITES = 'false'; // standalone 不支持
process.env.MONGO_OPT_W = '1';
process.env.MONGO_OPT_SERVERSELECTIONTIMEOUTMS = '2000';
process.env.MONGO_OPT_SOCKETTIMEOUTMS = '4000';
process.env.MONGO_OPT_CONNECTTIMEOUTMS = '2000';

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
