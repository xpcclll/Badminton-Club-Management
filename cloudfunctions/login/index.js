const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_ADMIN_PASSWORD = 'HHs200681'

async function getConfig() {
  try {
    const cfg = await db.collection('config').doc('global').get()
    return cfg.data || {}
  } catch (e) {
    return {}
  }
}

async function getUser(openid) {
  const res = await db.collection('users').where({ _openid: openid }).get()
  return res.data[0] || null
}

async function ensureUser(openid) {
  let user = await getUser(openid)
  if (user) return user

  const cfg = await getConfig()
  const role = (cfg.adminOpenids || []).indexOf(openid) >= 0 ? 'admin' : 'member'
  const doc = {
    _openid: openid,
    nickName: '',
    avatarUrl: '',
    phone: '',
    role: role,
    createdAt: db.serverDate()
  }
  const addRes = await db.collection('users').add({ data: doc })
  user = Object.assign({ _id: addRes._id }, doc)
  return user
}

async function login(openid) {
  const user = await ensureUser(openid)
  return { openid: openid, user: user }
}

async function adminLogin(event, openid) {
  const input = String(event.password || '')
  if (!input) throw new Error('请输入密码')
  const cfg = await getConfig()
  const expected = cfg.adminPassword || DEFAULT_ADMIN_PASSWORD
  if (input !== expected) throw new Error('密码错误')

  await ensureUser(openid)
  await db.collection('users').where({ _openid: openid }).update({ data: { role: 'admin' } })
  const user = await getUser(openid)
  return { openid: openid, user: user, isAdmin: true }
}

async function updateProfile(event, openid) {
  const data = {}
  if (typeof event.nickName === 'string') data.nickName = event.nickName
  if (typeof event.phone === 'string') data.phone = event.phone
  if (typeof event.avatarUrl === 'string') data.avatarUrl = event.avatarUrl
  await db.collection('users').where({ _openid: openid }).update({ data: data })
  return { updated: true }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'adminLogin': return { code: 0, data: await adminLogin(event, OPENID) }
      case 'update': return { code: 0, data: await updateProfile(event, OPENID) }
      default: return { code: 0, data: await login(OPENID) }
    }
  } catch (e) {
    return { code: 1, msg: e.message || '登录失败' }
  }
}
