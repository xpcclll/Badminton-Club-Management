function call(name, action, data) {
  return wx.cloud.callFunction({
    name: name,
    data: Object.assign({ action: action }, data)
  }).then(res => {
    const r = res.result
    if (r && r.code === 0) {
      return r.data
    }
    const msg = (r && r.msg) || '操作失败'
    return Promise.reject(new Error(msg))
  })
}

module.exports = {
  login: () => wx.cloud.callFunction({ name: 'login' }).then(res => {
    const r = res.result
    if (r && r.code === 0) {
      return r.data
    }
    return Promise.reject(new Error((r && r.msg) || '登录失败'))
  }),

  updateProfile: data => call('login', 'update', data),
  adminLogin: password => call('login', 'adminLogin', { password: password }),

  listActivities: () => call('activity', 'list'),
  getActivity: activityId => call('activity', 'detail', { activityId: activityId }),
  createActivity: data => call('activity', 'create', data),
  updateActivity: data => call('activity', 'update', data),
  finishActivity: activityId => call('activity', 'finish', { activityId: activityId }),
  removeActivity: activityId => call('activity', 'remove', { activityId: activityId }),
  signup: (activityId, court) => call('activity', 'signup', { activityId: activityId, court: court }),
  cancelSignup: activityId => call('activity', 'cancelSignup', { activityId: activityId }),
  checkin: (activityId, targetOpenid) => call('activity', 'checkin', { activityId: activityId, targetOpenid: targetOpenid }),
  cancelCheckin: (activityId, targetOpenid) => call('activity', 'cancelCheckin', { activityId: activityId, targetOpenid: targetOpenid }),

  addBall: data => call('record', 'addBall', data),
  removeBall: id => call('record', 'removeBall', { id: id }),
  addExpense: data => call('record', 'addExpense', data),
  removeExpense: id => call('record', 'removeExpense', { id: id }),

  myStats: () => call('stats', 'myStats'),
  overallStats: () => call('stats', 'overall'),
  inventorySummary: () => call('inventory', 'summary'),
  stockIn: data => call('inventory', 'stockIn', data)
}
