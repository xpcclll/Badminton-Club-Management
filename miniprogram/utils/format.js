function dateCN(s) {
  if (!s) return ''
  const p = String(s).split('-')
  if (p.length < 3) return s
  return p[1] + '月' + p[2] + '日'
}

function money(n) {
  const v = Number(n || 0)
  return v.toFixed(2)
}

const statusText = {
  draft: '草稿',
  open: '报名中',
  finished: '已结束',
  cancelled: '已取消'
}

function statusLabel(s) {
  return statusText[s] || s
}

module.exports = {
  dateCN: dateCN,
  money: money,
  statusLabel: statusLabel
}

