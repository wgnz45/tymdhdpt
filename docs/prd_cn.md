# 体育彩票小游戏平台 PRD（详细版）  
日期：2026-03-13  
范围：当前代码与 `314ae998-31eb-45ca-9ed1-0c57f69391a3` 文档覆盖的能力

## 1. 产品定位与目标
- 面向实体体彩门店的多租户 SaaS，核心是“内容运营 + 互动小游戏”。
- 通过门店门户聚合官方资讯、门店喜报和直播信息，同时提供超级大乐透选号、体彩顶呱刮抽票两款互动页。
- 提升到店转化与留存；支持外接实体按键，还原街机式体验；保障大屏/移动端展示效果。

## 2. 角色与权限
- 购彩用户：访问门户，浏览资讯/喜报，参与两个小游戏，查看开奖信息。
- 门店店长：管理本店基础信息、轮播素材、中奖上报、小游戏配置；查看门店统计；控制外设。
- 平台管理员（SuperAdmin）：创建/续期/停用门店，授予游戏权限，发布官方轮播与资讯，审核门店提交内容，查看平台级数据。

## 3. 架构与路由
- 前端：React + Vite，HashRouter。
  - `/s/:storeId` 门店门户（多主题，当前主用 sports/pop/vip）
  - `/s/:storeId/lotto` 超级大乐透选号页
  - `/s/:storeId/scratch` 顶呱刮抽票页
  - `/s/:storeId/admin` 门店后台；`/admin` 统一后台入口（含 SuperAdmin）
- 后端：Node/Express `server/index.js`，数据存储 `server/db.json`，静态 `data.json`。
- 爬虫：`server/crawler.js`（官方 JSON API），可选 `server/puppeteerCrawler.js`（福建站点 XHR 截获）。

## 4. 功能详解
### 4.1 门店运营门户（Store Portal）
- 头部信息：门店名、电话、跑马灯公告、当前时间；正向运势卡片（今日幸运数字、推荐游戏），严禁出现负面“忌”类词。
- 轮播区：混排官方下发与门店审核通过的图片；预留赛事视频播放源。
- 资讯区：
  - 官方资讯列表（行业/文化/地方三类），标题+日期点击跳转。
  - 门店中奖喜报：信息流或滚动榜，包含图片与文字说明，需审核通过后展示。
- 开奖与公益：
  - 国家级开奖看板：大乐透、排列3/5、7星彩，显示最新期号、球号、奖池、开奖时间。
  - 公益/微光数据：总筹集金额、项目数等。
- 小游戏入口：大乐透、顶呱刮卡片；未授权时置灰或隐藏。
- 自适应：优先 16:9，大屏/移动自动缩放 `scale`，隐藏“手动微调”面板写入 LocalStorage。

### 4.2 超级大乐透选号页（Home.jsx）
- 选号规则：5 红（01-35）+ 2 蓝（01-12），不重复且升序显示。
- 机选与套餐：一键随机；支持门店配置的复式/套餐快捷键。
- “我的彩票”：锁定/修改/删除；可批量锁定后分享。
- 分享：生成长图，含号码、门店水印、门店专属二维码；支持扫码/保存/企业微信推送。
- 动效与按键：机选动画+倒计时；实体按键触发同款机选流程。

### 4.3 体彩顶呱刮抽票（ScratchCard.jsx）
- 档位切换：10/20/30/50 元。
- 抽票动画：CSGO 滚轮式长廊，高速滚动后阻尼减速，定格唯一票面。
- 推荐提示：定格后提示“推荐购买第 N 张”（在该档位总本数内随机）。
- 重玩与按键：可随时换档或再次抽取；实体按键一拍即启。

### 4.4 门店后台（StoreConfig.jsx 规划为顶部 Tab）
- 基础设置：营业/关店；名称/联系方式同步前台；跑马灯公告；水印底图与引流二维码上传；企微机器人 webhook。
- 素材管理：轮播图提交、中奖喜报提交，展示“审核中/已发布”状态。
- 游戏配置：
  - 大乐透：常规快捷键、套餐组合开关与规则。
  - 顶呱刮：从总图库四档位勾选上架票面；设置每档抽取数量基数。
- 外设与账号：外设状态显示/一键启用街机模式；密码修改与安全退出。

### 4.5 平台总控后台（SuperAdmin.jsx）
- 门店管理：创建门店（ID、初始密码、有效期），到期控制；按游戏授权开关。
- 平台内容中心：发布官方资讯；上传全局轮播图或填入赛事视频流；维护官方图库。
- 审核台：审核各门店提交的轮播/中奖内容，执行通过或驳回。
- 信源监控：查看国家级数据与福建省数据分区；展示抓取快照与时间。

### 4.6 爬虫与数据源（server/crawler.js）
- 资讯与开奖：直接调用体彩官方 JSON API：
  - 资讯：`getInfoListByClusterAndKeywordV1.inf`（industry/local/culture）。
  - 公益：`getWelfareFundDetailV1.qry` + `index.json` 估算项目数。
  - 开奖：`getDigitalDrawInfoV1.qry` 获取大乐透/排列/7星彩最新期次与号码。
  - 轮播：`lottery.gov.cn/index.json` 解析 `tcweb-scroll` 的 `latestWinnerList`。
- 福建信源（可选）：`puppeteerCrawler.js` 监听 `fjtc.com.cn/data_api/lottery?type=...` 响应，解析 8 个彩种；缺失时自动 fallback。
- 超时与降级：统一 15s 超时；任一数据为空则回退本地高质量假数据，保证前端有内容。
- 返回字段：timestamp、industry/local/culture、carousel、welfare、draws、fujianDraws、puppeteerEnabled。

### 4.7 外设集成
- 实体拍拍乐按键映射为前端的机选/抽票触发。
- 门店后台显示“已启用/未启用”状态，可一键启用街机模式。

## 5. 视觉与交互规范
- 色彩：暖亮色背景（如 bg-orange-50），按钮主色红/蓝/橙；玻璃拟态面板。
- 图标：只用 Lucide React SVG，不用 emoji。
- 动效：小游戏动效使用 CSS/Framer，不卡顿；门户轮播与滚动平滑。
- 可访问性：对比度满足 WCAG AA；多终端适配。

## 6. 数据与统计
- 门店级：访问量、机选与套餐操作数、分享/导流率、（仅后台可见的）模拟核奖报表。
- 平台级：授权门店总数、到期状态分布、模块日活走势、开奖抓取成功率。

## 7. 接口与数据契约（简要）
- `GET /api/system/sources`：返回爬虫聚合数据（同 runAllCrawlers 输出结构）。
- `POST /api/system/sources/refresh`：手动触发抓取。
- `GET /api/store/:id`：门店基础信息与配置。
- `GET /api/store/:id/scratch`：门店勾选的顶呱刮票面与基数。
- `GET /data.json`：前端静态数据入口（打包时写入）。
- 上传/审核接口：轮播、中奖、图库等对应 `SuperAdmin` 和 `StoreConfig` 页面调用的现有端点（详见 server/index.js 路由）。

## 8. 未完项与风险
- 需要更新 `server/index.js` 数据结构：去掉足球相关，加入门户配置字段（轮播库、文章库、本店中奖列表）。
- `StoreConfig.jsx` 尚未完成顶部 Tab 重构。
- 需验证“删除 puppeteer 依赖时系统平滑降级”——理论有 fallback，需实测。

## 9. 关键文件索引
- 需求：`314ae998-31eb-45ca-9ed1-0c57f69391a3/prd.md.resolved`
- 任务清单：`314ae998-31eb-45ca-9ed1-0c57f69391a3/task.md.resolved.15`
- 信源方案：`314ae998-31eb-45ca-9ed1-0c57f69391a3/implementation_plan.md.resolved`
- 后端：`server/crawler.js`, `server/puppeteerCrawler.js`, `server/index.js`
- 前端：`src/pages/StorePortal.jsx`, `src/pages/Home.jsx`, `src/pages/ScratchCard.jsx`, `src/admin/SuperAdmin.jsx`, `src/admin/CrawlerMonitor.jsx`, `src/admin/StoreConfig.jsx`

## 10. 验收要点（建议）
- 门店门户：多终端展示无空白区，轮播与资讯均有内容（即使离线回退时）。
- 大乐透：机选/套餐正确生成 5+2 升序不重复；分享长图包含水印与二维码。
- 顶呱刮：四档位均可抽，动画减速定格唯一票面，推荐张数在档位范围内。
- 审核流：门店提交后在 SuperAdmin 可见并能通过/驳回，状态正确回显。
- 爬虫：正常网络下抓取官方数据；断网或接口异常时回退显示 fallback；福建模块缺失仍能启动。
