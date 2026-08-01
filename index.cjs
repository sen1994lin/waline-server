// ── Atlas MongoDB 连接修正（关键）──
process.env.MONGO_HOST = JSON.stringify([
  'ac-xjbfaxx-shard-00-00.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-01.qsluwd2.mongodb.net',
  'ac-xjbfaxx-shard-00-02.qsluwd2.mongodb.net',
]);
process.env.MONGO_PORT = JSON.stringify([27017, 27017, 27017]);

const Application = require('@waline/vercel');
const handler = Application({
  plugins: [],
  async postSave(comment) {},
});

module.exports = async (req, res) => {
  if (req.url === '/api/debug') {
    let result = {
      mongoHostEnv: process.env.MONGO_HOST,
      mongoPortEnv: process.env.MONGO_PORT,
      test: null,
    };
    try {
      const { MongoClient } = require('mongodb');
      const hosts = JSON.parse(process.env.MONGO_HOST).join(':27017,') + ':27017';
      const uri = `mongodb://17736018227senlin_db_user:E0nthcJX43yvrI4a@${hosts}/waline?serverSelectionTimeoutMS=8000&connectTimeoutMS=8000`;
      const t0 = Date.now();
      const c = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 });
      await c.connect();
      const ping = await c.db('admin').command({ ping: 1 });
      result.test = { ok: true, ping, elapsedMs: Date.now() - t0 };
      await c.close();
    } catch (e) {
      result.test = { ok: false, error: String(e).slice(0, 400), elapsedMs: Date.now() - t0 };
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(result, null, 2));
    return;
  }
  return handler(req, res);
};
