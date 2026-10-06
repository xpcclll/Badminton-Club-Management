App({
  globalData: {
    openid: '',
    user: null,
    isAdmin: false
  },

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，请升级后使用云能力',
        showCancel: false
      })
      return
    }
    wx.cloud.init({
      // 使用默认云环境即可；如有多个环境，把环境 ID 填到 env 字段
      traceUser: true
    })
  },

  login() {
    return wx.cloud.callFunction({ name: 'login' }).then(res => {
      const r = res.result
      if (r && r.code === 0) {
        this.globalData.openid = r.data.openid
        this.globalData.user = r.data.user
        this.globalData.isAdmin = r.data.user.role === 'admin'
        return r.data
      }
      return Promise.reject(new Error((r && r.msg) || '登录失败'))
    })
  },

  ensureLogin() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData)
    }
    return this.login()
  },

  refreshUser() {
    return this.login()
  }
})

