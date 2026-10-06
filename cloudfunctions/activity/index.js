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
    const cnt = await db.collection('signups')
      .where({ activityId: a._id, status: 'active' })
      .count()
    out.push(Object.assign({}, a, { signupCount: cnt.total }))
  }
  return ok(out)
}

async function detail(event, openid) {
  const activityId = event.activityId
  const a = await db.collection('activities').doc(activityId).get()
  if (!a.data) throw new Error('活动不存在')

  const [signups, balls, expenses] = await Promise.all([
    db.collection('signups').where({ activityId: activityId, status: 'active' }).orderBy('createdAt', 'asc').limit(1000).get(),
    db.collection('ball_records').where({ activityId: activityId }).orderBy('createdAt', 'asc').limit(1000).get(),
    db.collection('expenses').where({ activityId: activityId }).limit(1000).get()
  ])

  const mySignup = signups.data.find(s => s._openid === openid) || null
  const me = await getUser(openid)
  return ok({
    activity: a.data,
    signups: signups.data,
    balls: balls.data,
    expenses: expenses.data,
    mySignup: mySignup,
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
    .where({ activityId: activityId, _openid: openid, status: 'active' })
    .get()
  if (exist.data.length) throw new Error('你已报名')

  const courtCount = await db.collection('signups')
    .where({ activityId: activityId, court: court, status: 'active' })
    .count()
  if (courtCount.total >= (Number(a.capacityPerCourt) || 6)) throw new Error('该场地已满')

  const user = await getUser(openid)
  const res = await db.collection('signups').add({
    data: {
      activityId: activityId,
      court: court,
      _openid: openid,
      nickName: user ? user.nickName : '',
      avatarUrl: user ? user.avatarUrl : '',
      status: 'active',
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id })
}

async function cancelSignup(event, openid) {
  const activityId = event.activityId
  const res = await db.collection('signups')
    .where({ activityId: activityId, _openid: openid, status: 'active' })
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
      case 'update': return await update(event, OPENID)
      case 'finish': return await finish(event, OPENID)
      case 'remove': return await remove(event, OPENID)
      default: return fail('未知操作')
    }
  } catch (e) {
    return fail(e.message || '服务器错误')
  }
}

