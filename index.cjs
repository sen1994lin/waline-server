// Waline 留言墙 Vercel 服务端
//
// 第五层修复（与 postinstall patch-think-mongo.cjs 配合）：
//   standalone 模式：删 replicaSet + 单 host + retryWrites=false
//   让 mongodb driver 不做 serverSelection（不找 primary、不等副本集拓扑），
//   直接连 shard-00-00，写入只等那个单点返回。
//   Vercel 函数 maxDuration = 10s，standalone 1-2s 完成，能塞进 10s。
//
// 配合修复：
//   - W=1（写只等单点确认）
//   - serverSelectionTimeoutMS=2000（防御性，standalone 不会触发）
//   - socketTimeoutMS=4000（单次操作不卡）
//   - connectTimeoutMS=2000（TCP 连接快速失败）
//
// postinstall 脚本 (scripts/patch-think-mongo.cjs) 修改 think-mongo 的
//   acquireTimeoutMillis 默认 3000 -> 20000，给冷启动 20s 窗口。
//   Vercel 函数 10s 上限撞墙时 generic-pool 不会先抛错。

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
// 防御性 client 超时
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
