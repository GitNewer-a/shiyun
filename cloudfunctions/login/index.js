const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 登录：拿 openid，确保 users 集合里有这个人的记录。
 *
 * ⚠️ 这个函数**不能**因为建用户档失败就整体报错。
 * 前端把「调用成功 + 拿到 openid」当作云环境可用的判据；建用户档是附加动作，
 * 集合不存在 / 权限不足 / 索引冲突都不该把登录一起拖垮 ——
 * 否则 console 里永远是「login 云函数调用失败」，分不清是环境没连上还是建档案失败。
 * 所以这里分两段：取 openid（拿不到才算真失败）、写用户档（失败只降级并在 result 里标记）。
 */
exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { openid: '', ok: false, message: '未获取到 openid' };
  }

  const base = { openid: openid, ok: true };

  try {
    const existing = await db.collection('users').where({ openid: openid }).limit(1).get();
    if (existing.data && existing.data.length) {
      return Object.assign({}, base, { user: existing.data[0], created: false });
    }

    const user = {
      // ⚠️ 必须显式写 _openid。云函数以管理员身份写库，不会自动打这个字段，
      // 而集合的 PRIVATE 权限正是靠 _openid 判断「这条记录归谁」。
      // 少了它，记录就是「无主」的，客户端在 PRIVATE 权限下一条都读不到。
      _openid: openid,
      openid: openid,
      nickName: event.nickName || '诗友',
      avatarUrl: event.avatarUrl || '',
      level: 1,
      exp: 0,
      points: 0,
      streak: 0,
      createdAt: db.serverDate()
    };
    await db.collection('users').add({ data: user });
    return Object.assign({}, base, { user: user, created: true });
  } catch (err) {
    // errCode -502005 = 集合不存在。这是「还没初始化」的正常状态，不是故障。
    const code = err && (err.errCode || err.code);
    const missing = code === -502005 || /collection not exists|not exist/i.test(String(err && err.message));
    const reason = missing
      ? 'users 集合尚未创建（云开发控制台 → 数据库 → 新建集合 users）'
      : (err && err.message) || String(err);

    console.warn('[诗韵] 用户档案读写失败，登录降级为仅返回 openid：', reason);
    return Object.assign({}, base, { created: false, profileError: reason });
  }
};
