const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ok = data => ({ code: 0, data: data })
const fail = msg => ({ code: 1, msg: msg })

async function getUser(openid) {
  const res = await db.collection('users').where({ _openid: openid }).get()
  return res.data[0] || null
}

async function requireAdmin(openid) {
  const u = await getUser(openid)
  if (!u || u.role !== 'admin') {
    throw new Error('无管理员权限')
  }
  return u
}

function buildDoc(event, openid) {
  return {
    title: String(event.title || '').trim(),
    date: event.date || '',
    startTime: event.startTime || '',
    endTime: event.endTime || '',
    location: String(event.location || '').trim(),
    courts: (event.courts && event.courts.length) ? event.courts : ['1号场'],
    capacityPerCourt: Number(event.capacityPerCourt) || 6,
    ballsPerBucket: Number(event.ballsPerBucket) || 12,
    buckets: Number(event.buckets) || 0,
    bucketPrice: Number(event.bucketPrice) || 0,
    courtFee: Number(event.courtFee) || 0,
    signupDeadline: event.signupDeadline || '',
    remark: String(event.remark || ''),
    status: 'open',
    createdBy: openid
  }
}

async function create(event, openid) {
  await requireAdmin(openid)
  const doc = buildDoc(event, openid)
  if (!doc.title || !doc.date) throw new Error('标题和日期必填')
  doc.createdAt = db.serverDate()
  const res = await db.collection('activities').add({ data: doc })
  return ok({ _id: res._id })
}

async function list(event, openid) {
  const res = await db.collection('activities').orderBy('date', 'desc').limit(100).get()
  const out = []
  for (const a of res.data) {
    const active = await db.collection('signups')
      .where({ activityId: a._id, status: 'active' })
      .count()
    const waiting = await db.collection('signups')
      .where({ activityId: a._id, status: 'waiting' })
      .count()
    out.push(Object.assign({}, a, { signupCount: active.total, waitingCount: waiting.total }))
  }
  return ok(out)
}

async function detail(event, openid) {
  const activityId = event.activityId
  const a = await db.collection('activities').doc(activityId).get()
  if (!a.data) throw new Error('活动不存在')

  const [signups, balls, expenses, attendance] = await Promise.all([
    db.collection('signups').where({ activityId: activityId }).orderBy('createdAt', 'asc').limit(1000).get(),
    db.collection('ball_records').where({ activityId: activityId }).orderBy('createdAt', 'asc').limit(1000).get(),
    db.collection('expenses').where({ activityId: activityId }).limit(1000).get(),
    db.collection('attendance').where({ activityId: activityId }).limit(1000).get()
  ])

  const mySignup = signups.data.find(s => s._openid === openid) || null
  const myAttendance = attendance.data.find(x => x._openid === openid) || null
  const me = await getUser(openid)
  return ok({
    activity: a.data,
    signups: signups.data,
    balls: balls.data,
    expenses: expenses.data,
    attendance: attendance.data,
    mySignup: mySignup,
    myAttendance: myAttendance,
    isAdmin: !!(me && me.role === 'admin')
  })
}

async function signup(event, openid) {
  const activityId = event.activityId
  const court = event.court
  const a = (await db.collection('activities').doc(activityId).get()).data
  if (!a) throw new Error('活动不存在')
  if (a.status !== 'open') throw new Error('活动未开放报名')

  if (a.signupDeadline) {
    const now = new Date()
    const dl = new Date(String(a.signupDeadline).replace(/-/g, '/'))
    if (!isNaN(dl.getTime()) && now > dl) throw new Error('报名已截止')
  }

  const exist = await db.collection('signups')
    .where({ activityId: activityId, _openid: openid, status: _.in(['active', 'waiting']) })
    .get()
  if (exist.data.length) throw new Error('你已报名')

  const activeCount = await db.collection('signups')
    .where({ activityId: activityId, court: court, status: 'active' })
    .count()
  const status = activeCount.total >= (Number(a.capacityPerCourt) || 6) ? 'waiting' : 'active'

  const user = await getUser(openid)
  const res = await db.collection('signups').add({
    data: {
      activityId: activityId,
      court: court,
      _openid: openid,
      nickName: user ? user.nickName : '',
      avatarUrl: user ? user.avatarUrl : '',
      status: status,
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id, status: status })
}

async function cancelSignup(event, openid) {
  const activityId = event.activityId
  const my = await db.collection('signups')
    .where({ activityId: activityId, _openid: openid, status: _.in(['active', 'waiting']) })
    .get()
  if (!my.data.length) return ok({ removed: 0, promoted: null })

  const signup = my.data[0]
  await db.collection('signups').doc(signup._id).remove()

  let promoted = null
  if (signup.status === 'active') {
    const next = await db.collection('signups')
      .where({ activityId: activityId, court: signup.court, status: 'waiting' })
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()
    if (next.data.length) {
      await db.collection('signups').doc(next.data[0]._id).update({ data: { status: 'active' } })
      promoted = next.data[0]
    }
  }
  return ok({ removed: 1, promoted: promoted })
}

async function checkin(event, openid) {
  const activityId = event.activityId
  const target = event.targetOpenid || openid
  if (target !== openid) await requireAdmin(openid)

  const a = (await db.collection('activities').doc(activityId).get()).data
  if (!a) throw new Error('活动不存在')

  const s = await db.collection('signups')
    .where({ activityId: activityId, _openid: target, status: 'active' })
    .get()
  if (!s.data.length) throw new Error('该成员未报名')

  const exist = await db.collection('attendance')
    .where({ activityId: activityId, _openid: target })
    .get()
  if (exist.data.length) return ok({ already: true })

  const user = await getUser(target)
  const res = await db.collection('attendance').add({
    data: {
      activityId: activityId,
      _openid: target,
      nickName: user ? user.nickName : '',
      status: 'present',
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id })
}

async function cancelCheckin(event, openid) {
  const activityId = event.activityId
  const target = event.targetOpenid || openid
  if (target !== openid) await requireAdmin(openid)
  const res = await db.collection('attendance')
    .where({ activityId: activityId, _openid: target })
    .remove()
  return ok({ removed: res.stats.removed })
}

async function update(event, openid) {
  await requireAdmin(openid)
  const doc = buildDoc(event, openid)
  if (!doc.title || !doc.date) throw new Error('标题和日期必填')
  await db.collection('activities').doc(event.activityId).update({ data: doc })
  return ok({})
}

async function finish(event, openid) {
  await requireAdmin(openid)
  await db.collection('activities').doc(event.activityId).update({ data: { status: 'finished' } })
  return ok({})
}

async function remove(event, openid) {
  await requireAdmin(openid)
  await db.collection('activities').doc(event.activityId).update({ data: { status: 'cancelled' } })
  return ok({})
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'create': return await create(event, OPENID)
      case 'list': return await list(event, OPENID)
      case 'detail': return await detail(event, OPENID)
      case 'signup': return await signup(event, OPENID)
      case 'cancelSignup': return await cancelSignup(event, OPENID)
      case 'checkin': return await checkin(event, OPENID)
      case 'cancelCheckin': return await cancelCheckin(event, OPENID)
      case 'update': return await update(event, OPENID)
      case 'finish': return await finish(event, OPENID)
      case 'remove': return await remove(event, OPENID)
      default: return fail('未知操作')
    }
  } catch (e) {
    return fail(e.message || '服务器错误')
  }
}
