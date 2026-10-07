const app = getApp()
const api = require('../../utils/api')

Page({
  data: {
    user: null,
    isAdmin: false,
    openid: '',
    nickName: '',
    phone: '',
    adminPwd: '',
    saving: false,
    loggingIn: false
  },

  onShow() {
    app.ensureLogin()
      .then(data => {
        this.setData({
          user: data.user,
          isAdmin: data.user.role === 'admin',
          openid: data.openid,
          nickName: data.user.nickName || '',
          phone: data.user.phone || ''
        })
      })
      .catch(() => {})
  },

  onNick(e) {
    this.setData({ nickName: e.detail.value })
  },

  onPhone(e) {
    this.setData({ phone: e.detail.value })
  },

  onAdminPwd(e) {
    this.setData({ adminPwd: e.detail.value })
  },

  adminLogin() {
    if (!this.data.adminPwd) {
      wx.showToast({ title: '请输入管理员密码', icon: 'none' })
      return
    }
    this.setData({ loggingIn: true })
    api.adminLogin(this.data.adminPwd)
      .then(() => {
        wx.showToast({ title: '已登录为管理员', icon: 'success' })
        this.setData({ adminPwd: '' })
        app.refreshUser().then(() => this.onShow())
      })
      .catch(() => {})
      .then(() => this.setData({ loggingIn: false }))
  },

  bindWechat() {
    wx.getUserProfile({
      desc: '用于展示头像和昵称',
      success: res => {
        const info = res.userInfo || {}
        api.updateProfile({ nickName: info.nickName, avatarUrl: info.avatarUrl })
          .then(() => {
            wx.showToast({ title: '已绑定', icon: 'success' })
            app.refreshUser()
          })
          .catch(() => {})
      },
      fail: () => wx.showToast({ title: '已取消授权', icon: 'none' })
    })
  },

  save() {
    this.setData({ saving: true })
    api.updateProfile({ nickName: this.data.nickName, phone: this.data.phone })
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        app.refreshUser()
      })
      .catch(() => {})
      .then(() => this.setData({ saving: false }))
  }
})
