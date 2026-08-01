// Waline 留言墙 Vercel 服务端
// 关键修复：
//   1. Atlas Cluster0 副本集至少一个节点（shard-00-02）从 Vercel 边缘节点不可达，
//      即便设 w=1 / 短 serverSelection 仍卡 thinkjs 5s 资源超时。
//   2. 修法：去掉 replicaSet + 只用 1 个分片节点，强制 driver 走 standalone 模式
//      写入只等那个单点返回，绕开副本集拓扑探测。
//   3. 配套：w=1（不等副本 majority）+ 缩短 serverSelection/socket 超时。
//   4. 副作用：单点风险（如果 shard-00-00 挂掉就完蛋），但 M0 集群一般稳定，
//      而且换 shard-00-01 只需改 1 行环境变量。

// 4 个 MONGO_OPT_* 设为 process.env（必须在 require '@waline/vercel' 之前）
// 注意：必须用 ___*_RAW__ 防止 Waline 把数组误处理
process.env.MONGO_HOST = 'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net';
process.env.MONGO_PORT = '27017';
// 关键：去掉 replicaSet，让 driver 走 standalone
delete process.env.MONGO_REPLICASET;
process.env.MONGO_OPT_TLS = 'true';
process.env.MONGO_OPT_AUTH_SOURCE = 'admin';
// 关键：standalone 模式下 retryWrites 不支持，必须关
process.env.MONGO_OPT_RETRYWRITES = 'false';
// 写只等单点返回
process.env.MONGO_OPT_W = '1';
// 防御性超时（standalone 单点不需要等副本集，但保留以防 network 抖动）
process.env.MONGO_OPT_SERVERSELECTIONTIMEOUTMS = '2000';
process.env.MONGO_OPT_SOCKETTIMEOUTMS = '4000';
process.env.MONGO_OPT_CONNECTTIMEOUTMS = '2000';

// 在 require 之前尝试拉长 thinkjs 资源超时（如果 thinkjs 4 支持 resource_timeout 配置）
try {
  const think = require('thinkjs');
  if (typeof think.config === 'function') {
    think.config('resource_timeout', 20000);
  }
} catch (e) { /* ignore */ }

const Application = require('@waline/vercel');

module.exports = Application({
  plugins: [],
  async postSave(comment) {
    // do what ever you want after comment saved
  },
});
