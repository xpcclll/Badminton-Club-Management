const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getAdminOpenids() {
  try {
    const cfg = await db.collection('config').doc('global').get()
    return (cfg.data && cfg.data.adminOpenids) || []
  } catch (e) {
    return []
  }
}

async function login(OPENID) {
  const users = db.collection('users')
  const res = await users.where({ _openid: OPENID }).get()
  let user

  if (res.data.length === 0) {
    const adminOpenids = await getAdminOpenids()
    const cnt = await users.count()
    const role = (cnt.total === 0 || adminOpenids.indexOf(OPENID) >= 0) ? 'admin' : 'member'
    const doc = {
      _openid: OPENID,
      nickName: '',
      avatarUrl: '',
      phone: '',
      role: role,
      createdAt: db.serverDate()
    }
    const addRes = await users.add({ data: doc })
    user = Object.assign({ _id: addRes._id }, doc)
  } else {
    user = res.data[0]
  }

  return { openid: OPENID, user: user }
}

async function updateProfile(event, OPENID) {
  const data = {}
  if (typeof event.nickName === 'string') data.nickName = event.nickName
  if (typeof event.phone === 'string') data.phone = event.phone
  if (typeof event.avatarUrl === 'string') data.avatarUrl = event.avatarUrl
  await db.collection('users').where({ _openid: OPENID }).update({ data: data })
  return { updated: true }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    if (event.action === 'update') {
      return { code: 0, data: await updateProfile(event, OPENID) }
    }
    return { code: 0, data: await login(OPENID) }
  } catch (e) {
    return { code: 1, msg: e.message || '登录失败' }
  }
}

