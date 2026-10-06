# 羽毛球社活动管理小程序

一个基于**微信云开发**的羽毛球社管理小程序，用于管理活动、场地、报名接龙、用球记录与费用 AA 分摊。无需自建服务器，前端 + 云函数 + 云数据库一套搞定。

## 已实现功能

1. **活动管理**：管理员创建/结束/取消活动，设置日期时间、地点、多个场地、每场人数、报名截止时间、备注。
2. **报名接龙**：成员进入活动详情，选择一个场地报名；每个场地有人数上限，报名后展示「谁在哪个场地」。
3. **用球记录**：按「场地 + 成员」记录换球，支持快速 `+1`，也支持进入记球页选择数量和成员。
4. **费用 AA**：管理员录入「羽毛球 x 桶 x 单价」「场地费」「其他费用」，自动按实际报名人数均摊到每个人。
5. **一眼看清用球**：活动详情「场地与用球」视图按场地展示每位成员的用球数，并汇总每场/全场用球总量。
6. **统计**：个人维度（参加次数、累计用球、累计分摊）；管理员额外可见全员汇总。
7. **角色体系**：管理员 / 成员两种角色，接口层做权限校验。

## 目录结构

```
badminton-miniprogram/
├── project.config.json
├── miniprogram/                  # 小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── utils/                    # 请求封装、格式化工具
│   └── pages/
│       ├── index/                # 活动列表（首页）
│       ├── stats/                # 统计
│       ├── me/                   # 我的
│       └── activity/
│           ├── create/           # 创建活动
│           ├── detail/           # 活动详情（报名 / 用球 / 费用）
│           ├── ball/             # 记录用球
│           └── expense/          # 费用管理
└── cloudfunctions/               # 云函数
    ├── login/                    # 登录、更新资料
    ├── activity/                 # 活动增删改查、报名
    ├── record/                   # 用球、费用记录
    └── stats/                    # 统计
```

## 快速开始

1. **获取 AppID**：登录[微信公众平台](https://mp.weixin.qq.com)，注册小程序，拿到 AppID。把 `project.config.json` 里的 `appid` 从 `touristappid` 改成你的 AppID（云开发不支持游客模式）。

2. **导入项目**：用微信开发者工具「导入项目」，选择本目录，AppID 填上面的真实 AppID。

3. **开通云开发**：工具栏点「云开发」，开通并创建一个环境（记下环境 ID）。

4. **创建数据库集合**：在云开发控制台「数据库」里创建以下集合：
   - `users`
   - `activities`
   - `signups`
   - `ball_records`
   - `expenses`
   - `config`（可选，用于手动指定管理员）

   集合权限建议统一设为「**所有用户不可读写**」或「仅管理端可读写」，因为所有数据都通过云函数访问，这样最安全。

5. **上传云函数**：在开发者工具左侧 `cloudfunctions` 目录下，对 `login`、`activity`、`record`、`stats` 四个文件夹分别右键「上传并部署（云端安装依赖）」。部署时选择刚创建的环境。

6. **关联环境**：`miniprogram/app.js` 里 `wx.cloud.init` 默认使用当前默认环境。如果账号下有多个云环境，请把环境 ID 填进去：
   ```js
   wx.cloud.init({ env: '你的环境ID', traceUser: true })
   ```

7. **运行**：编译即可体验。

## 管理员说明

- **第一位登录的用户自动成为管理员**（`users` 集合为空时）。
- 也可以手动指定：在 `config` 集合中新建一条 `_id` 为 `global` 的文档，内容为：
  ```json
  { "adminOpenids": ["某个用户的openid"] }
  ```
  `login` 云函数会读取该配置，把名单内的用户设为管理员。
- 普通成员的 openid 可在「我的」页面查看。

## 数据模型

### activities（活动）
`title` 标题、`date` 日期(YYYY-MM-DD)、`startTime`/`endTime`、`location` 地点、`courts` 场地数组、`capacityPerCourt` 每场人数、`ballsPerBucket` 每桶球数、`buckets` 桶数、`bucketPrice` 桶单价、`courtFee` 场地费、`signupDeadline` 报名截止、`remark` 备注、`status` 状态、`createdBy` 创建者。

### signups（报名）
`activityId`、`court` 场地、`_openid`、`nickName`、`status`、`createdAt`。

### ball_records（用球记录）
`activityId`、`court`、`_openid`、`nickName`、`count` 颗数、`createdAt`。

### expenses（费用）
`activityId`、`type`(ball/court/other)、`description`、`amount`、`quantity`、`unitPrice`、`createdAt`。

### users（用户）
`_openid`、`nickName`、`avatarUrl`、`phone`、`role`(admin/member)、`createdAt`。

## 建议补充的功能

如果后续想继续完善，我建议按优先级考虑这些：

**高频实用**
- **签到/考勤**：活动当天扫码或一键签到，区分「报名了」和「实际到场」，费用可按到场人数分摊，避免鸽子。
- **候补队列**：场地满员后进入候补，有人退出自动补位。
- **鸽子/爽约记录**：报名未到累计次数，管理员可限制其报名或提醒。
- **订阅消息提醒**：活动开始前、报名截止前、被补位时推送微信服务通知。

**体验优化**
- **活动模板**：固定时间/场地的常规局一键复用，不用每次重新填。
- **多管理员**：可把核心骨干设为管理员，分摊创建/记账工作。
- **费用补录与退款**：支持临时人员按次缴费、缺席退款、余额/欠费明细。
- **按次/月费两种模式**：除了 AA，也支持会员月卡、单次付费。

**统计进阶**
- **图表可视化**：成员出勤趋势、用球趋势、每月费用报表。
- **账单导出**：导出 Excel / 图片分享到群，方便对账。
- **成员水平标签**：录入成员水平，管理员分配场地时自动平衡强弱。

## 常见问题

- **编译报错 `wx.cloud` 未定义**：确认开发者工具已开通云开发，并在 `app.js` 的 `onLaunch` 里成功执行了 `wx.cloud.init`。
- **调用云函数返回无权限**：确认当前登录用户角色正确（首用户自动为管理员），或已在 `config` 集合配置管理员 openid。
- **集合查询不到数据**：确认集合名称拼写一致，且云函数已重新部署。

> 提示：本项目的集合权限建议设为「所有用户不可读写」，数据读写统一走云函数，避免客户端越权。
