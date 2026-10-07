# 羽毛球社活动管理小程序

一个基于**微信云开发**的羽毛球社管理小程序，用于管理活动、场地、报名接龙、用球记录与费用 AA 分摊。无需自建服务器，前端 + 云函数 + 云数据库一套搞定。

## 已实现功能

1. **活动管理**：管理员创建/结束/取消活动，设置日期时间、地点、多个场地、每场人数、报名截止时间、备注。
2. **报名接龙 + 候补**：成员选择场地报名；场地满员自动进入候补，有人退出按顺序补位，详情页展示候补名单。
3. **签到考勤**：成员一键签到，管理员可代签/取消；费用默认按「实际到场人数」AA（无人签到时回退为报名人数）。
4. **用球记录**：按「场地 + 成员」记录换球，支持快速 `+1`，也支持进入记球页选择数量和成员。
5. **球库存管理**：管理员录入入库数量，系统自动用「入库 − 用球」计算剩余，低于预警线提示补球。
6. **费用 AA**：管理员录入「羽毛球 x 桶 x 单价」「场地费」「其他费用」，自动按到场人数均摊。
7. **账单导出**：一键生成文字账单并复制到剪贴板，方便粘贴到微信群对账。
8. **一眼看清用球**：活动详情「场地与用球」视图按场地展示每位成员的用球数，并汇总每场/全场用球总量。
9. **统计**：个人维度（参加次数、签到次数、累计用球、累计分摊）；管理员额外可见全员汇总。
10. **角色体系**：管理员密码登录 + 微信账号绑定，接口层做权限校验。

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
│       ├── inventory/            # 球库存管理
│       ├── me/                   # 我的
│       └── activity/
│           ├── create/           # 创建活动
│           ├── detail/           # 活动详情（报名 / 用球 / 费用）
│           ├── ball/             # 记录用球
│           └── expense/          # 费用管理
└── cloudfunctions/               # 云函数
    ├── login/                    # 登录、管理员密码登录、更新资料
    ├── activity/                 # 活动增删改查、报名/候补、签到
    ├── record/                   # 用球、费用记录
    ├── stats/                    # 统计
    └── inventory/                # 球库存管理
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
   - `attendance`（签到）
   - `stock_records`（球入库）
   - `config`（可选，用于管理员密码 / 库存预警线）

   集合权限建议统一设为「**所有用户不可读写**」或「仅管理端可读写」，因为所有数据都通过云函数访问，这样最安全。

5. **上传云函数**：在开发者工具左侧 `cloudfunctions` 目录下，对 `login`、`activity`、`record`、`stats`、`inventory` 五个文件夹分别右键「上传并部署（云端安装依赖）」。部署时选择刚创建的环境。

6. **关联环境**：`miniprogram/app.js` 里 `wx.cloud.init` 默认使用当前默认环境。如果账号下有多个云环境，请把环境 ID 填进去：
   ```js
   wx.cloud.init({ env: '你的环境ID', traceUser: true })
   ```

7. **运行**：编译即可体验。

## 管理员与登录

- **成员**：打开小程序自动用微信账号登录（绑定微信 openid），可在「我的」页一键绑定微信头像昵称。
- **管理员**：在「我的」页「管理员登录」输入密码即可把当前微信账号设为管理员。
  - 默认密码为 `HHs200681`，校验在云函数端进行，不会暴露给前端。
  - 修改密码：在云开发控制台 `config` 集合新建 `_id` 为 `global` 的文档，内容 `{ "adminPassword": "新密码" }`；或在 `cloudfunctions/login/index.js` 里修改 `DEFAULT_ADMIN_PASSWORD` 后重新部署。
  - 也可在该文档里用 `adminOpenids` 数组直接指定管理员 openid。
- 库存预警线（默认 24 颗）同样可在 `config` 集合里用 `lowStockThreshold` 修改。
- 普通成员的 openid 可在「我的」页面查看。

## 数据模型

### activities（活动）
`title` 标题、`date` 日期(YYYY-MM-DD)、`startTime`/`endTime`、`location` 地点、`courts` 场地数组、`capacityPerCourt` 每场人数、`ballsPerBucket` 每桶球数、`buckets` 桶数、`bucketPrice` 桶单价、`courtFee` 场地费、`signupDeadline` 报名截止、`remark` 备注、`status` 状态、`createdBy` 创建者。

### signups（报名）
`activityId`、`court` 场地、`_openid`、`nickName`、`status`（active 已报名 / waiting 候补）、`createdAt`。

### attendance（签到）
`activityId`、`_openid`、`nickName`、`status`(present)、`createdAt`。

### stock_records（球库存）
`type`(in)、`quantity` 入库颗数、`buckets` 桶数、`unitPrice` 每桶单价、`note`、`createdBy`、`createdAt`。

### ball_records（用球记录）
`activityId`、`court`、`_openid`、`nickName`、`count` 颗数、`createdAt`。

### expenses（费用）
`activityId`、`type`(ball/court/other)、`description`、`amount`、`quantity`、`unitPrice`、`createdAt`。

### users（用户）
`_openid`、`nickName`、`avatarUrl`、`phone`、`role`(admin/member)、`createdAt`。

## 建议补充的功能

如果后续想继续完善，我建议按优先级考虑这些：

**高频实用**
- **鸽子/爽约记录**：报名未到累计次数，管理员可限制其报名或提醒。
- **订阅消息提醒**：活动开始前、报名截止前、被补位时推送微信服务通知。

**体验优化**
- **活动模板**：固定时间/场地的常规局一键复用，不用每次重新填。
- **多管理员**：可把核心骨干设为管理员，分摊创建/记账工作。
- **费用补录与退款**：支持临时人员按次缴费、缺席退款、余额/欠费明细。
- **按次/月费两种模式**：除了 AA，也支持会员月卡、单次付费。

**统计进阶**
- **图表可视化**：成员出勤趋势、用球趋势、每月费用报表。
- **账单导出图片/Excel**：在现有「复制文字账单」基础上，导出图片或表格文件分享到群。
- **成员水平标签**：录入成员水平，管理员分配场地时自动平衡强弱。

## 常见问题

- **编译报错 `wx.cloud` 未定义**：确认开发者工具已开通云开发，并在 `app.js` 的 `onLaunch` 里成功执行了 `wx.cloud.init`。
- **调用云函数返回无权限**：确认已用管理员密码登录（「我的」→ 管理员登录），或在 `config` 集合配置了管理员 openid。
- **集合查询不到数据**：确认集合名称拼写一致，且云函数已重新部署。

> 提示：本项目的集合权限建议设为「所有用户不可读写」，数据读写统一走云函数，避免客户端越权。
