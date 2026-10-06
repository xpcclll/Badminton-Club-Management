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

async function addBall(event, openid) {
  const target = event.targetOpenid || openid
  if (target !== openid) {
    await requireAdmin(openid)
  }
  const count = Number(event.count) || 1
  if (count <= 0) throw new Error('数量无效')

  const user = await getUser(target)
  const res = await db.collection('ball_records').add({
    data: {
      activityId: event.activityId,
      court: event.court || '',
      _openid: target,
      nickName: user ? user.nickName : '',
      count: count,
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id })
}

async function removeBall(event, openid) {
  const rec = await db.collection('ball_records').doc(event.id).get().catch(() => null)
  if (!rec || !rec.data) throw new Error('记录不存在')
  const me = await getUser(openid)
  if (rec.data._openid !== openid && (!me || me.role !== 'admin')) {
    throw new Error('无权限删除')
  }
  await db.collection('ball_records').doc(event.id).remove()
  return ok({})
}

async function addExpense(event, openid) {
  await requireAdmin(openid)
  const amount = Number(event.amount) || 0
  if (amount <= 0) throw new Error('金额无效')
  const res = await db.collection('expenses').add({
    data: {
      activityId: event.activityId,
      type: event.type || 'other',
      description: event.description || '',
      amount: amount,
      quantity: Number(event.quantity) || 0,
      unitPrice: Number(event.unitPrice) || 0,
      createdBy: openid,
      createdAt: db.serverDate()
    }
  })
  return ok({ _id: res._id })
}

async function removeExpense(event, openid) {
  await requireAdmin(openid)
  await db.collection('expenses').doc(event.id).remove()
  return ok({})
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  try {
    switch (event.action) {
      case 'addBall': return await addBall(event, OPENID)
      case 'removeBall': return await removeBall(event, OPENID)
      case 'addExpense': return await addExpense(event, OPENID)
      case 'removeExpense': return await removeExpense(event, OPENID)
      default: return fail('未知操作')
    }
  } catch (e) {
    return fail(e.message || '服务器错误')
  }
}

