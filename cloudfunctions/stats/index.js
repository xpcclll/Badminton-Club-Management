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

async function myStats(openid) {
  const [signups, balls, attendance] = await Promise.all([
    db.collection('signups').where({ _openid: openid, status: 'active' }).orderBy('createdAt', 'desc').limit(1000).get(),
    db.collection('ball_records').where({ _openid: openid }).limit(1000).get(),
    db.collection('attendance').where({ _openid: openid }).limit(1000).get()
  ])

  const totalBalls = balls.data.reduce((s, b) => s + (Number(b.count) || 0), 0)
  let totalSpend = 0
  const activities = []

  for (const s of signups.data) {
    const a = await db.collection('activities').doc(s.activityId).get().catch(() => null)
    if (!a || !a.data) continue
    const [exp, parts, att] = await Promise.all([
      db.collection('expenses').where({ activityId: a._id }).limit(1000).get(),
      db.collection('signups').where({ activityId: a._id, status: 'active' }).count(),
      db.collection('attendance').where({ activityId: a._id }).count()
    ])
    const totalExp = exp.data.reduce((x, e) => x + (Number(e.amount) || 0), 0)
    const denominator = att.total || parts.total
    const share = denominator ? totalExp / denominator : 0
    totalSpend += share
    activities.push({
      key: a._id,
      activity: a.data,
      share: Math.round(share * 100) / 100
    })
  }

  return ok({
    signupCount: signups.data.length,
    attendanceCount: attendance.data.length,
    totalBalls: totalBalls,
    totalSpend: Math.round(totalSpend * 100) / 100,
    activities: activities
  })
}

async function overall(openid) {
  await requireAdmin(openid)
  const [users, signups, balls, expenses, activities, attendance] = await Promise.all([
    db.collection('users').limit(1000).get(),
    db.collection('signups').where({ status: 'active' }).limit(1000).get(),
    db.collection('ball_records').limit(1000).get(),
    db.collection('expenses').limit(1000).get(),
    db.collection('activities').limit(1000).get(),
    db.collection('attendance').limit(1000).get()
  ])

  const expByAct = {}
  expenses.data.forEach(e => {
    expByAct[e.activityId] = (expByAct[e.activityId] || 0) + (Number(e.amount) || 0)
  })
  const partByAct = {}
  signups.data.forEach(s => {
    partByAct[s.activityId] = (partByAct[s.activityId] || 0) + 1
  })
  const attByAct = {}
  attendance.data.forEach(a => {
    attByAct[a.activityId] = (attByAct[a.activityId] || 0) + 1
  })

  const rowByUser = {}
  users.data.forEach(u => {
    rowByUser[u._openid] = {
      openid: u._openid,
      nickName: u.nickName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      activities: 0,
      balls: 0,
      spend: 0
    }
  })

  balls.data.forEach(b => {
    const r = rowByUser[b._openid]
    if (r) r.balls += (Number(b.count) || 0)
  })

  const seen = {}
  signups.data.forEach(s => {
    const r = rowByUser[s._openid]
    if (!r) return
    const key = s._openid + '|' + s.activityId
    if (!seen[key]) {
      seen[key] = 1
      r.activities += 1
    }
    const totalExp = expByAct[s.activityId] || 0
    const parts = attByAct[s.activityId] || partByAct[s.activityId] || 1
    r.spend += totalExp / parts
  })

  const list = Object.keys(rowByUser)
    .map(k => Object.assign({}, rowByUser[k], { spend: Math.round(rowByUser[k].spend * 100) / 100 }))
    .sort((x, y) => y.activities - x.activities)

  return ok(list)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    if (event.action === 'overall') {
      return await overall(OPENID)
    }
    return await myStats(OPENID)
  } catch (e) {
    return fail(e.message || '服务器错误')
  }
}
