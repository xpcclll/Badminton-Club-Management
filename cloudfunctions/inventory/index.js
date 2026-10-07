const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ok = data => ({ code: 0, data: data })
const fail = msg => ({ code: 1, msg: msg })

async function getUser(openid) {
  const res = await db.collection('users').where({ _openid: openid }).get()
  return res.data[0] || null
}

async function requireAdmin(openid) {
  const u = await getUser(openid)
  if (!u || u.role !== 'admin') throw new Error('无管理员权限')
  return u
}

async function getThreshold() {
  try {
    const cfg = await db.collection('config').doc('global').get()
    return Number(cfg.data && cfg.data.lowStockThreshold) || 24
  } catch (e) {
    return 24
  }
}

async function summary(openid) {
  const [stockIn, balls] = await Promise.all([
    db.collection('stock_records').where({ type: 'in' }).orderBy('createdAt', 'desc').limit(1000).get(),
    db.collection('ball_records').orderBy('createdAt', 'desc').limit(1000).get()
  ])

  const totalIn = stockIn.data.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
  const totalOut = balls.data.reduce((s, b) => s + (Number(b.count) || 0), 0)
  const remaining = totalIn - totalOut
  const threshold = await getThreshold()
  const me = await getUser(openid)

  return ok({
    totalIn: totalIn,
    totalOut: totalOut,
    remaining: remaining,
    threshold: threshold,
    lowStock: remaining <= threshold,
    isAdmin: !!(me && me.role === 'admin'),
    recentIn: stockIn.data.slice(0, 20),
    recentOut: balls.data.slice(0, 20)
  })
}

async function stockIn(event, openid) {
  await requireAdmin(openid)
  const quantity = Number(event.quantity) || 0
  if (quantity <= 0) throw new Error('数量无效')

  const res = await db.collection('stock_records').add({
    data: {
      type: 'in',
      quantity: quantity,
      buckets: Number(event.buckets) || 0,
      unitPrice: Number(event.unitPrice) || 0,
      note: String(event.note || ''),
      createdBy: openid,
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id })
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    if (event.action === 'stockIn') {
      return await stockIn(event, OPENID)
    }
    return await summary(OPENID)
  } catch (e) {
    return fail(e.message || '服务器错误')
  }
}
