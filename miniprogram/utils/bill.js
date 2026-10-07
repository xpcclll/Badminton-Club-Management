const fmt = require('./format')

function buildBill(activity, activeSignups, attendance, expenses, balls) {
  const lines = []
  lines.push('【' + (activity.title || '羽毛球活动') + '】账单')
  lines.push('日期：' + activity.date + (activity.startTime ? ' ' + activity.startTime : ''))
  lines.push('地点：' + (activity.location || '未填写'))
  lines.push('')

  const sumBy = type => expenses
    .filter(e => e.type === type)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const ballFee = sumBy('ball')
  const courtFee = sumBy('court')
  const otherFee = sumBy('other')
  const total = ballFee + courtFee + otherFee

  lines.push('—— 费用明细 ——')
  lines.push('羽毛球：¥' + fmt.money(ballFee))
  lines.push('场地费：¥' + fmt.money(courtFee))
  if (otherFee) lines.push('其他：¥' + fmt.money(otherFee))
  lines.push('合计：¥' + fmt.money(total))
  lines.push('')

  const present = {}
  attendance.forEach(a => { present[a._openid] = 1 })
  const people = attendance.length
    ? activeSignups.filter(s => present[s._openid])
    : activeSignups
  const share = people.length ? total / people.length : 0

  lines.push('—— 分摊（' + people.length + ' 人）——')
  lines.push('人均：¥' + fmt.money(share))
  people.forEach(p => {
    lines.push('  ' + (p.nickName || '成员') + ' ¥' + fmt.money(share))
  })

  const ballTotal = balls.reduce((s, b) => s + (Number(b.count) || 0), 0)
  if (ballTotal) {
    lines.push('')
    lines.push('总用球：' + ballTotal + ' 颗')
  }
  return lines.join('\n')
}

module.exports = {
  buildBill: buildBill
}
