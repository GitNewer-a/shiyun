const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { openid: '', ok: false, message: '未获取到 openid' };
  }

  try {
    const existing = await db.collection('users').where({ openid }).limit(1).get();

    if (existing.data && existing.data.length) {
      return { openid, ok: true, user: existing.data[0], created: false };
    }

    const user = {
      openid,
      nickName: event.nickName || '诗友',
      avatarUrl: event.avatarUrl || '',
      level: 1,
      exp: 0,
      points: 0,
      streak: 0,
      createdAt: db.serverDate()
    };

    await db.collection('users').add({ data: user });
    return { openid, ok: true, user, created: true };
  } catch (err) {
    console.error('[诗韵] login 失败', err);
    return { openid, ok: false, message: err.message };
  }
};
