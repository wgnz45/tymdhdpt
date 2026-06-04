# 体彩门店互动平台 后台管理系统完整审计文档

> 生成日期�?026-04-16
> 目的：为后台页面布局重构与风格统一提供完整的架构、路由、API、数据结构参�?
---

## 1. 系统总览

| 维度 | 说明 |
|------|------|
| 前端框架 | React SPA，HashRouter 路由 |
| 后端框架 | Express (Node.js)，单文件 `server/index.js` (~2980 �? |
| 数据持久�?| JSON 文件读写：`server/db.json`（主库）、`public/data.json`（开奖数据） |
| 运行时状�?| `global.globalDeviceStatus`（内存对象，重启丢失�?|
| 部署端口 | 默认 3366，静态文件从 `dist/` 目录 serve |
| 定时任务 | `node-cron`，每分钟检查开奖抓取、每日凌�?00:05 抓取运势 |
| 爬虫模块 | `server/crawler.js`（开�?+ 顶呱刮票面）、`server/drawHistory.js`（历史开奖）、`server/crawlerFortune.js`（运势） |

---

## 2. 前端路由结构

> 定义文件：`src/App.jsx`

### 2.1 总站管理后台（Super Admin�?
```
/admin                    �?AdminLayout（外�?+ 侧边�?+ 鉴权�?  /admin                  �?Dashboard       （概览面板）
  /admin/config           �?StoreConfig      （内容管�?- 编辑 default 门店�?  /admin/winner-config    �?WinnerConfig     （喜报配�?- 编辑 default 门店�?  /admin/sub-sites        �?SuperAdmin       （分站管理）
  /admin/layout           �?LayoutManager    （图片素材）
  /admin/crawler          �?CrawlerMonitor   （信源监控）
  /admin/fortune          �?FortuneManager   （今日运势）
  /admin/settings         �?占位页面�?系统设置开发中..."�?```

**AdminLayout** (`src/admin/AdminLayout.jsx`) 职责�?- 根据 `location.pathname.startsWith('/admin')` 判断 `isMainAdmin`
- 构建 `menuItems` 数组（总站多出"分站管理"�?图片素材"�?信源监控"�?今日运势"�?- 渲染侧边�?+ `<Outlet />`
- 分站管理员的鉴权逻辑不在此处（总站 `isMainAdmin=true` 直接放行�?
### 2.2 分站管理后台（Store Admin�?
```
/admin/:storeId/*         �?重定向到 /s/:storeId/admin/config
```

> 注意：当�?`App.jsx` 中没�?`/s/:storeId/admin` 的路由定义�?> 分站管理后台路由实际未启用，分站管理员暂通过 SuperAdmin 页面内的模态框操作�?
### 2.3 门店客户端（Customer-Facing�?
```
/s/:storeId               �?StoreClientLayout（外壳：心跳 + 命令通道 + 数据轮询�?  /s/:storeId             �?PortalStyleSports    （默认页面）
  /s/:storeId/style-vip   �?PortalStyleVIP
  /s/:storeId/style-pop   �?PortalStylePop
  ...（共 13 个页面变�?+ calculator + scratch + lotto�?```

**StoreClientLayout** (`src/components/StoreClientLayout.jsx`) 职责�?- 包裹 `StoreDataProvider`（统一数据轮询：门�?30s、数据源 60s、公�?30s�?- 发送心�?`POST /api/store/:id/heartbeat`�?0s 间隔�?- 消费 `command`：`navigate`（页面跳转去抖）、`refresh`（Android WebView 兼容刷新�?- 合并心跳公告与数据层公告，通过 `HeartbeatContext` 下发

---

## 3. 管理页面详细说明

### 3.1 AdminLayout �?管理外壳

| 文件 | `src/admin/AdminLayout.jsx` |
|------|----------------------------|
| 行数 | ~270 |

**功能�?*
- 侧边栏菜单（响应式，移动端汉堡菜单）
- 顶部 header（移动端�?- 门店管理员鉴权（5 分钟超时，`sessionStorage` �?`auth_`、`storeKey_`、`lastActive_`�?- 门店存在性校�?`GET /api/store/:id`�?04 展示"站点不存�?�?- 退出登录清�?sessionStorage

**权限模型�?*
- 总站管理员：`isMainAdmin=true`，直接放行，各页面自行校�?`superKey`
- 门店管理员：需先通过 `POST /api/store/login` 验证 `adminKey`

**侧边栏菜单项�?*

| 图标 | 标签 | 总站路径 | 分站路径 |
|------|------|---------|---------|
| LayoutDashboard | 概览 | `/admin` | `/s/:id/admin` |
| Store | 内容管理 | `/admin/config` | `/s/:id/admin/config` |
| Trophy | 喜报配置 | `/admin/winner-config` | `/s/:id/admin/winner-config` |
| Globe | 分站管理 | `/admin/sub-sites` | �?|
| LayoutDashboard | 图片素材 | `/admin/layout` | �?|
| Radio | 信源监控 | `/admin/crawler` | �?|
| Sparkles | 今日运势 | `/admin/fortune` | �?|
| Settings | 系统设置 | `/admin/settings` | `/s/:id/admin/settings` |

---

### 3.2 Dashboard �?概览面板

| 文件 | `src/admin/Dashboard.jsx` |
|------|--------------------------|
| 行数 | ~607 |

**功能�?*
- 系统健康检查（`GET /api/health`�?- 总站：显示托管门店总数、营�?暂停统计
- 分站：显示当前门店名�?- 经营报表：analytics 数据表格（click_regular, click_package, share_count, share_amount�?- 彩票中心：tickets 表格（时间筛选、期号筛选、门店筛选、清空记录）
- DEBUG INFO 横幅�?*注意：生产环境应移除**�?
**API 调用�?*

| API | 方法 | 用�?| 权限 |
|-----|------|------|------|
| `/api/health` | GET | 系统心跳 | 公开 |
| `/api/super/stores?superKey=` | GET | 门店列表 | Super |
| `/api/store/:id` | GET | 门店信息 | 公开 |
| `/api/super/analytics?superKey=` | GET | 全局统计 | Super |
| `/api/store/analytics?id=&adminKey=` | GET | 门店统计 | Store |
| `/api/super/tickets?superKey=` | GET | 全局票据 | Super |
| `/api/store/tickets?id=&adminKey=` | GET | 门店票据 | Store |
| `/api/super/clear-tickets` | POST | 清空全部票据 | Super |
| `/api/store/clear-tickets` | POST | 清空门店票据 | Store |
| `/data.json` | GET | 期号列表（用于下拉） | 公开 |

---

### 3.3 StoreConfig �?内容管理

| 文件 | `src/admin/StoreConfig.jsx` |
|------|----------------------------|
| 行数 | ~800 |

**功能分区�?*

| 区块 | 标识 | 总站可见 | 分站可见 | 分站可编�?|
|------|------|---------|---------|-----------|
| 基础信息与密�?| `basic` | �?| ✅（仅联系人+电话�?| ✅（仅联系人+电话�?|
| 功能开关与玩法 | `games` | �?| ✅（只读�?| �?|
| 顶呱刮票面配�?| `scratch` | �?| ✅（只读�?| �?|

**基础信息区块（总站可编辑字段）�?*
- 门店唯一 ID（`config.id`�?- 管理密钥（`config.adminKey`�?- 店铺显示名称（`config.name`�?- 门店地址（`config.address`�?- 联系人（姓氏 + 称呼模板组合�?- 联系电话�?1 位数字）
- 公告内容/跑马灯（`config.marquees[]`�?- 营业状态开关（`config.status`: open/closed�?
**功能开关区块：**
- 常规选号模式开关（`features.regular`�?- 套餐选号模式开关（`features.package`�?- 防伪水印文字（`watermarkText`�?- 二维码图标链接（`qrCode`�?- 常规玩法编辑器（增删�?`gameConfig.regulars[]`�?- 套餐玩法编辑器（增删�?`gameConfig.packages[]`�?
**顶呱刮区块：**
- �?10/20/30/50 元档位分组显示全局图库
- 每档位多�?- 独立保存�?`/api/store/scratch/update`

**底部固定鉴权栏：**
- 密钥输入�?+ 提交按钮
- 分站只读区块�?disabled

**保存逻辑�?*
- 总站：提交整�?config �?`POST /api/store/update`
- 分站：只提交 `{ manager, contact, phone }` �?`POST /api/store/update`

**API 调用�?*

| API | 方法 | 用�?| 权限 |
|-----|------|------|------|
| `/api/store/:id` | GET | 加载门店配置 | 公开（剥�?adminKey�?|
| `/api/store/:id/scratch` | GET | 加载门店刮刮卡配�?| 公开 |
| `/api/super/scratch/library?superKey=` | GET | 全局刮刮卡图�?| Super |
| `/api/store/update` | POST | 保存门店配置 | Store/Super |
| `/api/store/scratch/update` | POST | 保存刮刮卡配�?| Store/Super |

**联系�?电话校验�?*
- 前端：姓�?1-2 中文字符 + 称呼模板（店�?先生/女士�?- 前端：电�?11 位纯数字
- 后端：`isValidManagerByTemplates()` 正则校验
- 后端：`isValidPhone11()` + `normalizePhone11()` 标准�?
---

### 3.4 WinnerConfig �?喜报配置

| 文件 | `src/admin/WinnerConfig.jsx` |
|------|------------------------------|
| 行数 | ~460 |

**功能�?*
- **全局模板管理**（仅总站）：增删改喜报模板（pattern + variables�?- **变量选项管理**（仅总站）：编辑每个变量的可选值（逗号分隔�?- **敏感词管�?*（仅总站）：配置敏感词列�?- **门店喜报编辑**：选择模板 �?填充变量 �?生成喜报文本
- 门店报告保存�?`POST /api/store/update`（config.winnerReports�?- 总站模板保存�?`POST /api/super/winner-config/update`

**数据来源合并�?*
- 加载 `/api/system/winner-config`（全局模板�?- 加载 `/api/system/sources`（合�?`sources.winners` �?`preset_line` 选项�?- 总站额外加载 `/api/store/default` �?`/api/super/stores`

**API 调用�?*

| API | 方法 | 用�?| 权限 |
|-----|------|------|------|
| `/api/system/winner-config` | GET | 全局喜报模板 | 公开 |
| `/api/system/sources` | GET | 数据源（�?winners 列表�?| 公开 |
| `/api/store/:storeId` | GET | 门店配置（含 winnerReports�?| 公开 |
| `/api/store/default` | GET | 默认门店配置 | 公开 |
| `/api/super/stores?superKey=` | GET | 门店数量统计 | Super |
| `/api/super/winner-config/update` | POST | 保存全局模板 | Super |
| `/api/store/update` | POST | 保存门店喜报 | Store/Super |

**喜报验证流程（后端）�?*
1. `ensureWinnerCenterConfig(db)` �?标准化模�?+ 合并数据�?winner �?2. `validateAndBuildWinnerReports()` �?逐条校验�?   - 模板 ID 必须存在且启�?   - 每个变量必须有值且在可选项�?   - 敏感词检查（变量�?+ 渲染结果双重检查）
   - `maxReports` 上限截断

---

### 3.5 SuperAdmin �?分站管理

| 文件 | `src/admin/SuperAdmin.jsx` |
|------|---------------------------|
| 行数 | ~1200+ |

**这是功能最密集的页面，承担 6 个子系统�?*

#### 3.5.1 分站 CRUD
- 列表展示所有门店（在线状�?+ 当前页面�?0s 自动刷新�?- 创建门店（指�?ID、名称、渠�?`tv`/`android`/`announcement`、城市）
- 删除门店（级联删�?tickets + analytics�?- Android 门店快捷编辑弹窗（名称、地址、联系人�?
#### 3.5.2 公告管理
- 公告列表（带标签 + 城市范围 scope: ALL/具体城市�?- 新建/编辑/删除公告
- 公告配置（duration, interval, speed, rounds, intervalUnit, type: RESIDENT/...�?- 标签管理（增删改标签 + 颜色�?- 实时预览（`AdminMarqueePreview` 组件�?- 批量保存�?`/api/super/announcements/batch-update`

#### 3.5.3 全局配置
- 计算器开关（`showCalculator`�?- 动画时长（`animationDuration`�?- 套餐动画时长（`packageDuration`�?- 称呼模板管理（`managerTitleTemplates`�?
#### 3.5.4 远程控制
- 单台设备导航（`POST /api/super/store/:id/command`�?- 全部刷新（`POST /api/super/refresh-all-pages`�?- 手动开奖输入（`POST /api/super/manual-draw`�?- 强制数据刷新（`POST /api/super/refresh-data`�?
#### 3.5.5 门店配置模态框
- 点击门店卡片上的"配置"按钮打开 `StoreConfig` 组件模态框
- 传入 `storeId`, `initialKey`, `superKey`, `onClose`

#### 3.5.6 实时状�?- 在线/离线判断：`Date.now() - lastPing < 30000`�?0s 超时�?- �?10s 自动刷新门店列表

**API 调用�?*

| API | 方法 | 用�?|
|-----|------|------|
| `/api/super/stores?superKey=` | GET | 加载门店列表 |
| `/api/super/config?superKey=` | GET | 加载全局配置 |
| `/api/super/announcements?superKey=` | GET | 加载公告 |
| `/api/super/announcements/batch-update` | POST | 批量保存公告+标签+配置 |
| `/api/super/create-store` | POST | 创建门店 |
| `/api/super/delete-store` | POST | 删除门店 |
| `/api/super/store/:id/command` | POST | 下发远程命令 |
| `/api/super/refresh-all-pages` | POST | 刷新全部页面 |
| `/api/super/refresh-data` | POST | 强制刷新开奖数�?|
| `/api/super/manual-draw` | POST | 手动录入开�?|
| `/api/super/update-config` | POST | 更新全局配置 |
| `/api/store/update` | POST | 快捷编辑 Android 门店 |

---

### 3.6 CrawlerMonitor �?信源监控

| 文件 | `src/admin/CrawlerMonitor.jsx` |
|------|-------------------------------|
| 行数 | ~420+ |

**功能�?*
- 数据源状态展示（`GET /api/system/sources`�?- 历史开奖查看（`GET /api/system/draw-history?size=50`�?- 自动抓取 Cron 配置（星期、开始时间、结束时间、间隔）
- 下次抓取时间计算与倒计�?- 开奖显示配置（`drawHistorySize` 1-50、`scrollHoldMs` 1000-10000�?- 手动刷新数据源（`POST /api/system/sources/refresh`�?
**Cron 配置结构（`cronConfig`）：**
```json
{
  "days": [0,1,2,3,4,5,6],
  "startHour": 21, "startMinute": 25,
  "endHour": 22, "endMinute": 0,
  "interval": 5,
  "enabled": true
}
```

**API 调用�?*

| API | 方法 | 用�?|
|-----|------|------|
| `/api/system/sources` | GET | 数据源状�?|
| `/api/system/draw-history?size=&force=` | GET | 历史开�?|
| `/api/super/config?superKey=` | GET | 加载 cron 配置 |
| `/api/super/update-config` | POST | 保存 cron 配置 / 显示配置 |
| `/api/system/sources/refresh` | POST | 手动刷新数据�?|

---

### 3.7 LayoutManager �?图片素材

| 文件 | `src/admin/LayoutManager.jsx` |
|------|-------------------------------|
| 行数 | ~500+ |

**三个 Tab�?*

#### Tab 1: Logo/布局素材（`logo`�?- 上传/URL导入/文件上传/删除/编辑
- 开奖信息图标映射（`drawLogoMap`：彩种名 �?素材 ID�?- 图标透明度滑块（`drawLogoOpacity` 0-1�?- 外部 URL 下载到本�?
**DRAW_LOGO_TARGETS 映射目标�?*
```
超级大乐�? 排列3, 排列5, 7星彩, 36�?, 22�?, 31�?, 31�?附加
```

#### Tab 2: 轮播图素材（`carousel`�?- 上传/删除/编辑

#### Tab 3: 顶呱刮票面（`scratch`�?- 上传（指定档�?10/20/30/50�?- 编辑（名称、档位、介绍、最高奖金、正�?背面 URL、启�?禁用�?- 批量启用/禁用
- 批量删除
- 官方爬取（`POST /api/super/scratch/crawl`�?- 外部 URL 下载到本�?
**API 调用�?*

| API | 方法 | 用�?|
|-----|------|------|
| `/api/super/config?superKey=` | GET | 加载 drawLogoMap + opacity |
| `/api/super/layout/library?superKey=` | GET | Logo 图库 |
| `/api/super/layout/upload` | POST | 上传 Logo |
| `/api/super/layout/delete` | POST | 删除 Logo |
| `/api/super/layout/update` | POST | 编辑 Logo |
| `/api/super/layout/download-external` | POST | 外部 URL 下载 |
| `/api/super/carousel/library?superKey=` | GET | 轮播图库 |
| `/api/super/carousel/upload` | POST | 上传轮播�?|
| `/api/super/carousel/delete` | POST | 删除轮播�?|
| `/api/super/carousel/download-external` | POST | **后端未定�?*，前端通用函数可构造此 URL 但轮播图 Tab 无按钮触�?|
| `/api/super/scratch/library?superKey=` | GET | 刮刮卡全局图库 |
| `/api/super/scratch/upload` | POST | 上传刮刮�?|
| `/api/super/scratch/update` | POST | 编辑刮刮�?|
| `/api/super/scratch/delete` | POST | 删除单个 |
| `/api/super/scratch/update-batch` | POST | 批量启用/禁用 |
| `/api/super/scratch/delete-batch` | POST | 批量删除 |
| `/api/super/scratch/crawl` | POST | 爬取官方票面 |
| `/api/super/scratch/download-external` | POST | 外部 URL 下载 |
| `/api/super/update-config` | POST | 保存 drawLogoMap + opacity |

---

### 3.8 FortuneManager �?今日运势

| 文件 | `src/admin/FortuneManager.jsx` |
|------|-------------------------------|
| 行数 | ~236 |

**功能�?*
- 12 生肖运势预览（卡片网格）
- 12 星座运势预览（卡片网格）
- 一键同步抓取（`POST /api/super/fortune/refresh`�?- 上次同步时间显示

**运势数据结构�?*
```
{ zodiacs: [{id, name, icon, luckyColor, luckyColorHex, luckyNumber, yi}], 
  constellations: [...同结构], 
  lastUpdated: ISO string }
```

**API 调用�?*

| API | 方法 | 用�?|
|-----|------|------|
| `/api/super/fortune` | GET | 加载运势数据 |
| `/api/super/fortune/refresh` | POST | 手动同步（需 superKey�?|

---

## 4. 后端 API 完整清单

> 文件：`server/index.js`，端�?`3366`

### 4.1 公开接口（无鉴权�?
| 端点 | 方法 | 行号 | 说明 |
|------|------|------|------|
| `/api/health` | GET | 665 | 健康检查，返回 `{status:'ok', uptime}` |
| `/api/store/:id` | GET | 811 | 门店公开配置（剥�?adminKey，Android 渠道�?default �?gameConfig�?|
| `/api/announcements/:storeId` | GET | 861 | 门店公告（按城市过滤，scope=ALL 或匹�?store.city�?|
| `/api/store/:id/scratch` | GET | 2180 | 门店刮刮卡公开数据（仅启用 + 已选中的票面） |
| `/api/system/sources` | GET | 2822 | 数据源（�?layoutLibrary, drawLogoMap, drawHistorySize, fortuneData, drawHistory 等合并输出） |
| `/api/system/winner-config` | GET | 2853 | 全局喜报模板（公开，用于前端加载模板） |
| `/api/system/image-proxy?url=` | GET | 2861 | 图片代理 |
| `/api/system/draw-history?size=&force=` | GET | 2886 | 历史开奖数�?|
| `/api/system/sources/refresh` | POST | 2923 | 手动刷新数据源（CrawlerMonitor 调用�?|
| `/api/super/fortune` | GET | 2936 | 运势数据 |
| `/data.json` | GET | 145 | 当期开奖数据（�?dist/data.json�?|
| `/api/scratch-image/:file` | GET | 167 | 本地合成票面图片静态文�?|

### 4.2 门店管理员接�?
| 端点 | 方法 | 行号 | 说明 |
|------|------|------|------|
| `/api/store/login` | POST | 672 | 登录验证（id + adminKey�?|
| `/api/store/update` | POST | 684 | 更新门店配置（adminKey �?superKey 二选一�?|
| `/api/store/analytics?id=&adminKey=` | GET | 767 | 门店统计 |
| `/api/store/tickets?id=&adminKey=&period=` | GET | 785 | 门店票据 |
| `/api/store/clear-tickets` | POST | 1763 | 清空门店票据 |
| `/api/store/scratch/config?id=&adminKey=` | GET | 2141 | 门店刮刮卡配�?|
| `/api/store/scratch/update` | POST | 2153 | 保存门店刮刮卡配�?|
| `/api/store/:id/heartbeat` | POST | 884 | 客户端心跳（含命令消�?+ 公告推送） |

### 4.3 超级管理员接�?
| 端点 | 方法 | 行号 | 说明 |
|------|------|------|------|
| `/api/super/stores?superKey=` | GET | 1078 | 门店列表（含在线状态注入） |
| `/api/super/config?superKey=` | GET | 1206 | 全局配置（cronConfig, drawLogoMap, managerTitleTemplates 等） |
| `/api/super/update-config` | POST | 1145 / 2573 | 更新全局配置（多字段可选更新，**存在 2 个重复定�?*�?|
| `/api/super/create-store` | POST | 1038 | 创建门店（复�?default �?gameConfig�?|
| `/api/super/delete-store` | POST | 1098 | 删除门店（级联删 tickets + analytics�?|
| `/api/super/store/:id/command` | POST | 928 | 下发远程命令到指定门�?|
| `/api/super/refresh-all-pages` | POST | 942 | 刷新所有在线设备页�?|
| `/api/super/refresh-data` | POST | 1133 | 强制刷新开奖数�?|
| `/api/super/manual-draw` | POST | 2519 | 手动录入开奖结�?|
| `/api/super/analytics?superKey=` | GET | 1720 | 全局统计 |
| `/api/super/tickets?superKey=&period=&storeId=` | GET | 1729 | 全局票据（含自动兑奖检查） |
| `/api/super/clear-tickets` | POST | 1751 | 清空全部票据和统�?|
| `/api/super/winner-config?superKey=` | GET | 1233 | 全局喜报配置 |
| `/api/super/winner-config/update` | POST | 1244 | 更新全局喜报配置 |
| `/api/super/winner-broadcast` | POST | 1364 | 批量推送喜报到指定门店 |
| `/api/super/announcements?superKey=` | GET | 1266 | 获取公告列表 |
| `/api/super/announcements/batch-update` | POST | 1277 | 批量保存公告+配置+标签 |
| `/api/super/announcements/update` | POST | 1308 | 单条更新/新建公告 |
| `/api/super/announcements/delete` | POST | 1352 | 删除公告 |
| `/api/super/layout/library?superKey=` | GET | 964/1410/2225 | Logo 素材库（存在 3 个重复定义） |
| `/api/super/layout/upload` | POST | 971/1417/2233 | 上传 Logo |
| `/api/super/layout/delete` | POST | 998/1435/2253 | 删除 Logo |
| `/api/super/layout/update` | POST | 1013/1445 | 编辑 Logo |
| `/api/super/layout/download-external` | POST | 1467 | 外部 URL 下载到本�?|
| `/api/super/carousel/library?superKey=` | GET | 2275 | 轮播图库 |
| `/api/super/carousel/upload` | POST | 2283 | 上传轮播�?|
| `/api/super/carousel/delete` | POST | 2303 | 删除轮播�?|
| `/api/super/carousel/download-external` | POST | �?| **后端未定义此路由**，前�?`handleDownloadExternal` 可生成此 URL 但轮播图 Tab 无触发按�?|
| `/api/super/scratch/library?superKey=` | GET | 1828 | 刮刮卡全局图库 |
| `/api/super/scratch/upload` | POST | 1804 | 上传刮刮�?|
| `/api/super/scratch/update` | POST | 1836 | 编辑刮刮�?|
| `/api/super/scratch/delete` | POST | 1868 | 删除单个（含物理文件清理 + 引用清理�?|
| `/api/super/scratch/delete-batch` | POST | 1917 | 批量删除 |
| `/api/super/scratch/update-batch` | POST | 1965 | 批量启用/禁用 |
| `/api/super/scratch/crawl` | POST | 1987 | 爬取官方票面 |
| `/api/super/scratch/download-external` | POST | 2046 | 外部 URL 下载 |
| `/api/super/fortune/refresh` | POST | 2946 | 手动同步运势（需 superKey�?|

### 4.4 前端行为追踪接口

| 端点 | 方法 | 行号 | 说明 |
|------|------|------|------|
| `/api/track/click` | POST | 1653 | 点击追踪（storeId, type: regular/package, count�?|
| `/api/track/share` | POST | 1673 | 分享追踪（创�?ticket + 更新 analytics�?|
| `/api/wechat/send-image` | POST | 2326 | 企业微信 Webhook 发图（storeId + file，使�?`multer.single('file')` 处理 multipart 上传�?|
| `/api/generate-qr` | POST | 2357 | QR 码生成（保存截图�?temp + 返回 QR dataURL�?|

---

## 5. 数据结构

### 5.1 db.json 顶层结构

```jsonc
{
  "superConfig": { /* 全局配置，详�?5.2 */ },
  "stores": [ /* 门店数组，详�?5.3 */ ],
  "analytics": { /* "storeId": { click_regular, click_package, share_count, share_amount } */ },
  "tickets": [ /* 票据数组，详�?5.4 */ ],
  "centralAnnouncements": [ /* 公告数组，详�?5.5 */ ],
  "layoutLibrary": [ /* Logo/布局素材数组 */ ],
  "carouselLibrary": [ /* 轮播图素材数�?*/ ],
  "scratchLibrary": [ /* 顶呱刮全局图库，详�?5.6 */ ],
  "sources": { /* 爬虫数据缓存 */ },
  "drawHistory": { /* 历史开奖缓�?*/ },
  "fortuneData": { /* 运势数据 */ }
}
```

### 5.2 superConfig 字段

| 字段 | 类型 | 默认�?| 说明 | 使用页面 |
|------|------|--------|------|---------|
| `platformName` | string | "彩票云管理系�? | 平台名称 | �?|
| `superKey` | string | "admin888" | 超管密钥 | 所�?/api/super/* 接口 |
| `cronConfig` | object | �?3.6 | 自动抓取配置 | CrawlerMonitor |
| `showCalculator` | boolean | false | 计算器开�?| SuperAdmin |
| `animationDuration` | number | 5000 | 常规动画时长(ms) | SuperAdmin �?前台 |
| `packageDuration` | number | 30000 | 套餐动画时长(ms) | SuperAdmin �?前台 |
| `drawHistorySize` | number | 6 | 开奖历史显示条�?1-50) | CrawlerMonitor �?前台 |
| `scrollHoldMs` | number | 3000 | 滚动停留时间(1000-10000) | CrawlerMonitor �?前台 |
| `drawLogoMap` | object | {} | 彩种→Logo素材ID映射 | LayoutManager �?前台 |
| `drawLogoOpacity` | number | 0.18 | Logo透明�?0-1) | LayoutManager �?前台 |
| `managerTitleTemplates` | string[] | ["店长","先生","女士"] | 称呼模板 | SuperAdmin �?StoreConfig |
| `winnerCenter` | object | �?5.7 | 喜报中心配置 | WinnerConfig |
| `winnerSensitiveWords` | string[] | ["必中","保中",...] | 敏感�?| WinnerConfig |
| `announcementConfig` | object | {...} | 公告全局配置 | SuperAdmin �?前台 |
| `availableTags` | array | [{name,color}] | 公告标签�?| SuperAdmin |
| `wechatConfig` | object | null | 企业微信应用配置 | �?|
| `scratchImages` | array | [] | **已废�?*，迁移至顶层 scratchLibrary | �?|

### 5.3 Store 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识�?default" 为主站） |
| `adminKey` | string | 门店管理密钥 |
| `name` | string | 显示名称 |
| `channel` | string | 渠道�?tv" / "android" / "announcement" |
| `city` | string | 城市（用于公告过滤） |
| `slogan` | string | 标语 |
| `address` | string | 地址 |
| `manager` | string | 联系人（"X店长"格式�?|
| `contact` / `phone` | string | 联系电话�?1位，双向同步�?|
| `theme` | string | 主题（目前固�?"default"�?|
| `status` | string | "open" / "closed" |
| `qrCode` | string | 二维码链接（android 渠道隐藏�?|
| `watermarkText` | string | 防伪水印 |
| `webhookUrl` | string | 企业微信 Webhook URL |
| `features` | object | `{ regular: bool, package: bool, scratchCard: bool }` |
| `gameConfig` | object | `{ regulars: [...], packages: [...] }` |
| `marquees` | array | `[{ id, text }]` 跑马灯公�?|
| `winnerReports` | array | `[{ id, templateId, values, text, enabled }]` |
| `scratchConfig` | object | `{ selected: {10:[ids],20:[ids],...}, tierDrawCounts: {10:1,...} }` |

**Android 渠道特殊逻辑（后端）�?*
- `GET /api/store/:id` 时，�?`channel === 'android'`�?  - 清空 `qrCode`
  - �?default 门店�?`gameConfig` 覆盖当前门店�?
### 5.4 Ticket 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | UUID |
| `storeId` | string | 所属门�?|
| `period` | string | 期号（如 "26029"�?|
| `mode` | string | "regular" / "package" |
| `type` | string | 玩法类型 |
| `numbers` | array | `[{ red/reds: [], blue/blues: [] }]` |
| `count` | number | 注数 |
| `price` | number | 价格 |
| `timestamp` | number | 创建时间�?|
| `status` | string | "pending" / "won" / "lost" |
| `winAmount` | number | 中奖金额 |
| `winLevel` | string[] | 中奖等级 ["一等奖"] |

### 5.5 Announcement 对象

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `content` / `text` | string | 公告内容 |
| `status` | boolean | 是否启用 |
| `scope` | string | "ALL" 或具体城市名 |
| `tags` | string[] | 标签 |
| `duration` | number | 展示时长 |
| `interval` | number | 间隔 |
| `speed` | number | 滚动速度 |
| `createdAt` | string | 创建时间 |

### 5.6 ScratchLibrary �?
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | "sc-{{timestamp}}-{{random}}" |
| `tier` | number | 10/20/30/50 |
| `name` | string | 名称 |
| `url` | string | 显示图片 URL |
| `imageDataUrl` | string | 原始 base64（如本地�?|
| `type` | string | "external" / "local" |
| `enabled` | boolean | 是否启用 |
| `frontUrl` | string | 正面图（体验预览�?|
| `backUrl` | string | 背面图（官方原画�?|
| `intro` | string | 票面介绍 |
| `maxPrize` | string | 最高奖�?|
| `createdAt` | number | 创建时间�?|

### 5.7 WinnerCenter 结构

```jsonc
{
  "maxReports": 10,        // 每店最大喜报数(1-20)
  "templates": [
    {
      "id": "scratch_big",
      "label": "顶呱刮中奖喜�?,
      "pattern": "恭喜本站彩民刮中顶呱刮「{ticket_name}」{amount}大奖",
      "variables": ["ticket_name", "amount"],
      "enabled": true
    }
  ],
  "variableOptions": {
    "ticket_name": ["瑞龙星祥"],
    "amount": ["10万元", "68万元"],
    "preset_line": ["恭喜本店彩民中出大乐透二等奖�?, ...]
  }
}
```

### 5.8 public/data.json 结构

```jsonc
{
  "latest": {
    "period": "�?6029�?,
    "date": "03�?1�?周六",
    "reds": ["03","05","17","33","35"],
    "blues": ["05","07"],
    "pool": "",
    "drawOrder": "03 05 17 33 35 + 05 07"
  },
  "history": [
    { "period": "26028", "date": "03-18", "reds": [...], "blues": [...] }
  ],
  "updateTime": "03/21 21:50"
}
```

---

## 6. 内存运行时状�?
### 6.1 global.globalDeviceStatus

```jsonc
{
  "storeId": {
    "lastPing": 1711084800000,    // 最后心跳时间戳
    "currentPage": "/s/default",  // 当前页面路径
    "pendingCommand": {           // 待消费命令（60s 过期�?      "action": "navigate",       // "navigate" | "refresh"
      "path": "/",                // navigate 专用
      "timestamp": 1711084800000  // refresh 专用（去重用�?    }
  }
}
```

**在线判断�?* `Date.now() - lastPing < 30000`�?0 秒超时）
**命令过期�?* 60 秒后自动清除
**刷新全部�?* �?`lastPing` �?5 分钟内的设备下发 `refresh` 命令

---

## 7. 后端辅助函数

| 函数 | 行号 | 说明 |
|------|------|------|
| `normalizePhone11()` | 378 | 电话号码标准化（只留数字，截�?11 位） |
| `isValidPhone11()` | 379 | 11 位数字校�?|
| `isValidManagerByTemplates()` | 385 | 联系人格式校验（X + 称呼模板�?|
| `normalizeManagerTitleTemplates()` | 332 | 称呼模板标准化（去重、去空、保底默认） |
| `normalizeAnnouncementTags()` | 352 | 标签标准化（去重、颜色转 RGB、保底默认） |
| `ensureManagerTitleTemplates()` | 365 | 确保数据库中有称呼模�?|
| `ensureWinnerCenterConfig()` | 539 | 确保喜报中心配置完整 + 合并数据�?winner �?|
| `normalizeWinnerCenter()` | 465 | 喜报中心标准化（模板去重、变量同步、默认值填充） |
| `validateAndBuildWinnerReports()` | 594 | 逐条验证 + 渲染喜报文本（敏感词双重检查） |
| `containsSensitiveWord()` | 582 | 敏感词命中检�?|
| `renderWinnerText()` | 590 | 模板渲染 |
| `extractSourceWinnerLines()` | 529 | 从数据源提取 winner 行文�?|
| `autoResultCheck()` | 2411 | 自动兑奖（比�?data.json 历史数据，更�?ticket 状态） |
| `autoRefreshSources()` | 2777 | 定时刷新数据源（cron 触发�?|
| `isCronTime()` | 2618 | 判断当前时间是否匹配 cron 配置 |
| `fetchLotteryData()` | 2634 | 从体�?API 抓取开奖并写入 public/data.json |

---

## 8. 定时任务

| Cron 表达�?| 行号 | 说明 |
|-------------|------|------|
| `* * * * *` | 2797 | 每分钟执�?`autoRefreshSources(false)`（内部判�?isCronTime�?|
| `5 0 * * *` | 2803 | 每日 00:05 执行 `fetchAllFortune()` 写入 db.fortuneData |

---

## 9. 认证与权限模�?
### 9.1 超级管理员（Super Admin�?- 密钥：`superConfig.superKey`（默�?"admin888"�?- 存储位置：`sessionStorage.getItem('superKey')`
- 验证方式：每�?`/api/super/*` 接口比对 `superKey`
- 页面自行鉴权：各 admin 页面内部 `useState` 管理 `isAuthed`

### 9.2 门店管理员（Store Admin�?- 密钥：`store.adminKey`
- 存储位置：`sessionStorage.getItem('storeKey_${storeId}')`
- 验证方式：`POST /api/store/login` �?�?auth 标记
- 超时�? 分钟无操作自动登出（AdminLayout 管理�?- 活动追踪：mousemove / keydown / click / scroll / touchstart 重置计时�?
### 9.3 权限层级

```
Super Admin（superKey�?  ├── 可操作所有门店的全部配置
  ├── 可创�?删除门店
  ├── 可下发远程命�?  ├── 可管理全局素材�?  └── 可管理公告、喜报模�?
Store Admin（adminKey�?  ├── 仅可编辑本门店联系人和电�?  ├── 可查看本门店配置（只读）
  ├── 可查看本门店统计和票�?  └── 可清空本门店票据
```

---

## 10. 前端数据�?
### 10.1 StoreDataProvider（统一数据轮询�?
> 文件：`src/hooks/useStoreData.jsx`

| 数据 | 轮询间隔 | API |
|------|---------|-----|
| 门店配置 | 30s | `GET /api/store/:id` |
| 数据�?| 60s | `GET /api/system/sources` |
| 公告 | 30s | `GET /api/announcements/:storeId` |
| 历史开�?| 首次加载 | `GET /api/system/draw-history` |

**输出 Context�?*
```
{ storeId, storeData, sourcesData, announcements, annConfig, drawHistory, notFound, refreshStore, refreshSources }
```

### 10.2 HeartbeatContext（心跳通道�?
> 文件：`src/components/StoreClientLayout.jsx`

**输出�?*
```
{ announcements, availableTags, announcementConfig }
```

**合并策略�?* 心跳公告优先于数据层公告（`heartbeatAnnouncements.length > 0 ? heartbeat : dataLayer`�?
### 10.3 usePerformanceMode

> 文件：`src/hooks/usePerformanceMode.js`

检�?Android 低性能设备（deviceMemory �?4 �?hardwareConcurrency �?4），返回 boolean�?
### 10.4 performanceConfig

> 文件：`src/utils/performanceConfig.js`

| 函数 | 盒子模式 | 普通模�?|
|------|---------|---------|
| `getHeartbeatIntervalMs` | 30s | 15s |
| `getHomePollingIntervalMs` | 3min | 1min |
| `getNoisePhaseIntervalMs` | 120ms | 50ms |

---

## 11. 跨文件耦合与重构风�?
### 11.1 高风险耦合�?
| 耦合 | 涉及文件 | 风险说明 |
|------|---------|---------|
| `sourcesData` 合并输出 | `server/index.js` GET /api/system/sources | 后端�?drawLogoMap、drawHistorySize、scrollHoldMs、layoutLibrary、fortuneData 等全塞进 sources 响应；前�?`PortalStyleSports.jsx` 消费时直接从 `sources` 取这些字段。重构时需拆分或保持兼�?|
| `GET /api/store/:id` 响应合并 | `server/index.js` line 811 | 后端自动注入 `managerTitleTemplates`、`showCalculator`、`animationDuration`、`packageDuration` 等全局字段到门店响应。前端多处依赖这些字�?|
| Android 渠道 gameConfig 覆盖 | `server/index.js` line 829 | Android 门店�?gameConfig 被后端用 default 门店覆盖，前端不感知此逻辑 |
| 重复路由定义 | `server/index.js` | `/api/super/layout/library` �?layout 接口定义�?3 次（line 964, 1410, 2225），Express 使用第一个匹配；重构时需清理 |
| contact/phone 双向同步 | `server/index.js` + `StoreConfig.jsx` | 后端 `config.contact` �?`config.phone` 互相镜像；前�?`StoreConfig` 管理两个独立 state |
| sessionStorage 密钥分散 | `AdminLayout.jsx`, `SuperAdmin.jsx`, `LayoutManager.jsx`, `CrawlerMonitor.jsx` | 各页面独立从 sessionStorage 读写 `superKey`，无统一鉴权中间�?|

### 11.2 中风险耦合�?
| 耦合 | 涉及文件 | 风险说明 |
|------|---------|---------|
| 标签颜色 RGB 标准�?| `SuperAdmin.jsx` + `server/index.js` + `PortalStyleSports.jsx` | 前端多处�?`normalizeColorToRgb` / `getTagColor`；后�?`normalizeAnnouncementTags` 也做标准�?|
| `drawLogoMap` 彩种名硬编码 | `LayoutManager.jsx` + `PortalStyleSports.jsx` + `server/index.js` | `DRAW_LOGO_TARGETS` 8 个彩种名�?LayoutManager �?PortalStyleSports 两处硬编�?|
| 票据自动兑奖 | `server/index.js` autoResultCheck | 内嵌�?`GET /api/super/tickets` �?`GET /api/store/tickets` 调用中，每次查询触发 |
| 刮刮�?ID 清理 | `server/index.js` delete/delete-batch | 删除图库项时级联清理所有门�?`scratchConfig.selected` 中的引用 ID |

### 11.3 重构建议方向

1. **后端路由去重**：layout library 相关路由定义�?3 遍，只保留最后一组（line 2225+�?2. **鉴权中间�?*：将 `superKey` 校验提取�?Express middleware，避免每个路由重复写
3. **全局配置注入方式**：`GET /api/store/:id` 自动注入全局字段的方式不利于前端区分"门店字段"�?全局字段"，建议分�?4. **数据源合并输�?*：`GET /api/system/sources` 塞了太多不相关字段，建议按职责拆�?5. **DEBUG 横幅**：`Dashboard.jsx` 中有 debug 信息（line 353-368），生产应移�?6. **sessionStorage 管理**：提取统一�?auth 工具函数
7. **分站管理后台路由**：当�?`App.jsx` 中缺�?`/s/:storeId/admin` 路由组，分站管理仅通过模态框实现

---

## 12. 前端管理端文件清�?
| 文件 | 路径 | 职责 | 懒加�?|
|------|------|------|--------|
| App.jsx | `src/App.jsx` | 路由定义 | �?|
| AdminLayout.jsx | `src/admin/AdminLayout.jsx` | 管理外壳 + 侧边�?+ 分站鉴权 | �?|
| Dashboard.jsx | `src/admin/Dashboard.jsx` | 概览面板 + 统计 + 票据 | �?|
| StoreConfig.jsx | `src/admin/StoreConfig.jsx` | 门店配置编辑器（基础/玩法/刮刮卡） | �?|
| WinnerConfig.jsx | `src/admin/WinnerConfig.jsx` | 喜报模板 + 门店喜报 | �?|
| SuperAdmin.jsx | `src/admin/SuperAdmin.jsx` | 分站管理 + 公告 + 全局配置 + 远程控制 | �?|
| CrawlerMonitor.jsx | `src/admin/CrawlerMonitor.jsx` | 信源监控 + Cron 配置 | �?|
| LayoutManager.jsx | `src/admin/LayoutManager.jsx` | Logo/轮播�?刮刮卡素材管�?| �?|
| FortuneManager.jsx | `src/admin/FortuneManager.jsx` | 运势管理 | �?|
| StoreClientLayout.jsx | `src/components/StoreClientLayout.jsx` | 客户端外壳（心跳 + 数据轮询�?| �?|
| useStoreData.jsx | `src/hooks/useStoreData.jsx` | 统一数据轮询 Context | �?|
| usePerformanceMode.js | `src/hooks/usePerformanceMode.js` | 低性能检�?| �?|
| performanceConfig.js | `src/utils/performanceConfig.js` | 性能参数配置 | �?|

---

## 13. 后端文件清单

| 文件 | 路径 | 职责 |
|------|------|------|
| index.js | `server/index.js` | Express 主服务（~2980 行，所�?API + 爬虫调度�?|
| crawler.js | `server/crawler.js` | 开奖数据爬�?+ 顶呱刮票面爬�?+ 图片合成 |
| drawHistory.js | `server/drawHistory.js` | 历史开奖批量抓�?|
| crawlerFortune.js | `server/crawlerFortune.js` | 运势数据爬取（生�?+ 星座�?|
| db.json | `server/db.json` | 主数据库 |
| data.json | `public/data.json` | 当期开奖数据（爬虫写入，前端直接读取） |

---

## 14. 后端依赖与中间件

### 14.1 关键 npm 依赖

| 包名 | 用�?|
|------|------|
| `express` | Web 框架 |
| `cors` | 跨域支持 |
| `compression` | gzip 压缩 |
| `multer` | 文件上传处理（内存模式） |
| `axios` | HTTP 客户端（爬虫 + 企业微信 API�?|
| `form-data` | 构�?multipart 表单 |
| `crypto` | UUID 生成 + MD5（WeChat webhook 签名�?|
| `qrcode` | QR 码生�?|
| `node-cron` | 定时任务调度 |
| `puppeteer` | 无头浏览器（爬虫模块使用�?|

### 14.2 Express 中间件配�?
```js
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));        // �?body 支持 base64 图片上传
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '../dist'), {
    setHeaders: (res, requestPath) => {
        if (requestPath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));
```

**特殊静态路由：**
- `/data.json` �?�?`dist/data.json` 返回，禁用缓�?- `/api/scratch-image/:file` �?�?`SCRATCH_IMG_DIR` 返回本地合成票面图片
- `GET /^(?!\/api).+/` �?catchall 返回 `dist/index.html`（SPA 回退），禁用缓存

---

## 15. PrizeCalculator 兑奖引擎

> `server/index.js` line 1544-1649

**九等大奖对照表（大乐透标准）�?*

| 红球命中 | 蓝球命中 | 等级 | 奖金 |
|---------|---------|------|------|
| 5 | 2 | 一等奖 | 10,000,000 |
| 5 | 1 | 二等�?| 100,000 |
| 5 | 0 | 三等�?| 10,000 |
| 4 | 2 | 四等�?| 3,000 |
| 4 | 1 | 五等�?| 300 |
| 3 | 2 | 六等�?| 200 |
| 4 | 0 | 七等�?| 100 |
| 3+1 �?2+2 | �?| 八等�?| 15 |
| 3+0 �?2+1 �?1+2 �?0+2 | �?| 九等�?| 5 |

**调用时机�?*
- `GET /api/super/tickets` �?`GET /api/store/tickets` 查询票据时触�?`autoResultCheck(db)`
- 比对 `public/data.json` 中的 `latest` + `history` 数据
- 更新 ticket �?`status`（pending→won/lost）、`winAmount`、`winLevel`

---

## 16. 前端管理端共享工具函数（重复定义�?
以下函数在两个文件中各有一�?*完全相同**的副本，重构时应提取为公共模块：

| 函数 | SuperAdmin.jsx 行号 | StoreConfig.jsx 行号 | 用�?|
|------|---------------------|---------------------|------|
| `DEFAULT_MANAGER_TITLES` | 166 | 5 | 默认称呼列表 `['店长','先生','女士']` |
| `sanitizeManagerTitles()` | 170 | 9 | 标准化称呼列表（去重、去空、保底） |
| `splitManagerText()` | 223 | 19 | 拆分联系人文本为 { surname, title } |
| `normalizeColorToRgb()` | 211 | �?| 颜色值标准化�?rgb() 格式 |

> 建议：提取到 `src/utils/adminHelpers.js` 统一导出�?
---

## 17. UI 组件风格模式（重构参考）

### 17.1 技术栈

- **CSS 框架�?* Tailwind CSS（所有样式均�?utility class�?- **图标库：** `lucide-react`（每个管理页面独�?import�?- **字体�?* 系统默认
- **动画�?* Tailwind 内置（`animate-pulse`、`animate-in`、`fade-in`、`slide-in-from-*`、`zoom-in-*`�?
### 17.2 管理端共�?UI 模式

| 模式 | Tailwind 实现 | 出现页面 |
|------|-------------|---------|
| 卡片容器 | `bg-white p-4 rounded-2xl shadow-sm border border-gray-100` | 几乎所有页�?|
| 区块标题 | `text-lg font-bold text-gray-800 border-b pb-2` | StoreConfig, WinnerConfig |
| 表单输入 | `w-full px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-500` | StoreConfig |
| 密钥输入 | `px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono` | StoreConfig 底部�?|
| 开关组�?| `sr-only peer` + `w-11 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-600` + after 伪元�?| StoreConfig, SuperAdmin |
| 消息提示 | `p-4 rounded-xl bg-green-50 text-green-600 border` �?`bg-red-50 text-red-600` | 所有页�?|
| 粘性底�?| `sticky bottom-0 z-10 bg-gray-900 px-6 py-3 rounded-2xl` | StoreConfig |
| 表格 | `w-full text-sm text-left` + `thead bg-gray-50` + `tbody divide-y divide-gray-100` | Dashboard |
| 标签/徽章 | `px-2 py-0.5 rounded text-xs font-bold bg-{color}-100 text-{color}-700` | Dashboard, SuperAdmin |
| 模态框 | `fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm` | StoreConfig, WinnerConfig, SuperAdmin |
| 标签�?| `bg-gray-200 rounded-lg p-1 gap-1` + 选中�?`bg-white shadow-sm` | CrawlerMonitor, LayoutManager |
| 侧边栏菜单项 | `flex items-center px-4 py-3 rounded-lg` + 选中 `bg-blue-50 text-blue-600` | AdminLayout |

### 17.3 各页�?lucide-react 图标使用

| 页面 | 图标 |
|------|------|
| AdminLayout | `LayoutDashboard, Store, Settings, LogOut, Menu, X, Globe, Radio, Sparkles, Trophy` |
| SuperAdmin | `Plus, Store, Trash2, Key, Settings, RefreshCcw, Tv, Smartphone, LayoutGrid, List, Link, Activity, Home, X, Save, ArrowLeft, Search, ChevronRight, RotateCcw, ChevronDown` |
| StoreConfig | `Save, RefreshCcw, Lock, Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, Ticket, CheckSquare, Square` |
| WinnerConfig | `Plus, Trash2, Save, X` |
| Dashboard | FontAwesome (`fa-solid fa-chart-line, fa-ticket, fa-circle-exclamation, fa-store-slash, fa-trash`) |
| LayoutManager | `ImageIcon, Link, Trash2, Loader2, Plus, ArrowLeft, Edit2, X, Save, Download, ToggleLeft, ToggleRight, Ticket, Upload, Presentation, Globe` |
| CrawlerMonitor | `Globe, RefreshCcw, Flag, Cpu` |
| FortuneManager | `Sparkles, RefreshCw, Calendar, CheckCircle, AlertCircle, Info` |

> **注意�?* Dashboard 使用 FontAwesome 图标，其余管理页面全部使�?lucide-react。风格不统一，重构时应统一图标库�?
---

## 18. 迁移逻辑（initDB�?
> `server/index.js` line 174-220

系统启动时执行数据库迁移，当前有以下迁移�?
| 迁移 | 说明 |
|------|------|
| `superConfig.scratchImages` �?顶层 `scratchLibrary` | 将旧版刮刮卡数据迁移到新位置，迁移后清空旧数�?|
| 初始�?`layoutLibrary` | 若不存在则创建空数组，并添加默认 Logo |
| 初始�?`carouselLibrary` | 若不存在则创建空数组 |
| 初始�?`centralAnnouncements` | 若不存在则创建空数组 |
| 初始化各门店 `city` 字段 | 默认 "福州" |
| 初始�?`managerTitleTemplates` | 默认 `["店长","先生","女士"]` |

---

## 19. 企业微信集成

### 19.1 应用消息模式（App Mode�?- 获取 access_token �?上传图片�?media �?发送应用图片消�?- 配置：`wechatConfig.corpId`, `wechatConfig.secret`, `wechatConfig.agentId`, `wechatConfig.targetUser`
- Token 缓存：内存变�?`wechatToken`（提�?60s 过期�?
### 19.2 Webhook 模式
- 计算图片 MD5 + Base64 �?POST �?Webhook URL
- 配置：`store.webhookUrl`
- 前端调用：`POST /api/wechat/send-image`（multipart/form-data�?
---

## 20. 构建与部署配�?
### 20.1 Vite 配置

> 文件：`vite.config.js`

```js
export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['Chrome >= 70', 'Android >= 8', 'iOS >= 13', 'Safari >= 13', 'Edge >= 79', 'Firefox >= 68'],
      renderLegacyChunks: true,
      modernPolyfills: false
    })
  ],
  build: { cssTarget: 'chrome61' },  // 保守 CSS 输出，兼容旧 Android 内核
  server: {
    host: '0.0.0.0',
    proxy: { '/api': { target: 'http://127.0.0.1:3366', changeOrigin: true } }
  }
})
```

**关键决策�?*
- `legacy` 插件 + `cssTarget: chrome61`：为 Android 电视盒子（低版本 Chromium）提供兼�?- 开发代理：`/api` 转发�?Express 后端 3366

### 20.2 Capacitor 配置（Android APK 壳）

> 文件：`capacitor.config.json`

```json
{
  "appId": "com.cj.lottery",
  "appName": "体彩门店互动平台",
  "webDir": "dist",
  "server": {
    "url": "http://114.55.243.23",
    "cleartext": true
  }
}
```

**说明�?* APK 壳内�?WebView 直接加载远程服务器地址，不包含本地前端资源。更新时只需更新服务器端�?`dist/` 文件，无需重新发版�?
### 20.3 Tailwind CSS 配置

> 文件：`tailwind.config.js` + `src/index.css`

```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: []
}
```

`src/index.css` 使用 `@import "tailwindcss"` + `@theme` 块手动覆盖大量颜色变量（全部�?Hex 值），注释标�?html2canvas 兼容�?——因�?html2canvas 不支�?oklch/oklab 等现代颜色格式�?
### 20.4 前端依赖版本

> 文件：`package.json`

| 关键依赖 | 版本 | 用�?|
|---------|------|------|
| react / react-dom | 19.2.0 | UI 框架 |
| react-router-dom | 7.13.0 | 路由 |
| lucide-react | 0.563.0 | 图标�?|
| html2canvas | 1.4.1 | 截图生成（分享功能） |
| axios | 1.13.6 | HTTP 客户端（StorePortal 使用�?|
| @capacitor/core | 8.0.2 | Android �?|
| cheerio | 1.2.0 | HTML 解析（爬虫辅助） |
| tailwindcss | 4.1.18 | CSS 框架 |
| vite | 7.2.4 | 构建工具 |

### 20.5 后端依赖版本

> 文件：`server/package.json`

| 关键依赖 | 版本 | 用�?|
|---------|------|------|
| express | 4.18.2 | Web 框架 |
| compression | 1.7.4 | gzip 压缩 |
| cors | 2.8.5 | 跨域 |
| multer | 2.0.2 | 文件上传 |
| axios | 1.13.4 | HTTP 客户�?|
| node-cron | 4.2.1 | 定时任务 |
| qrcode | 1.5.4 | QR 码生�?|
| puppeteer | 24.39.0 | 无头浏览器（爬虫�?|

### 20.6 NPM Scripts

| 脚本 | 前端 package.json | 后端 server/package.json |
|------|-------------------|-------------------------|
| dev | `vite --host` | `nodemon index.js` |
| build | `vite build` | �?|
| start | �?| `node index.js` |
| preview | `vite preview` | �?|
| test | `vitest run` | �?|
| lint | `eslint .` | �?|

---

## 21. 前端入口与错误边�?
> 文件：`src/main.jsx`

- 使用 `StrictMode` 包裹
- 自定�?`ErrorBoundary` 类组件捕获渲染错误，展示红色错误信息 + 组件堆栈
- `createRoot` 渲染 `<App />`

---

## 22. 客户端页面变体完整列�?
> 这些页面不在管理端范围内，但管理端配置直接影响它们的展示

| 文件 | 路由后缀 | 说明 |
|------|---------|------|
| PortalStyleSports.jsx | `/` | 默认主页（当前主力页面） |
| PortalStyleSportsNeo.jsx | `style-sports-neo` | Sports 新版 |
| PortalStyleSportsSticker.jsx | `style-sports-sticker` | 贴纸�?|
| PortalStyleSportsGuochao.jsx | `style-sports-guochao` | 国潮�?|
| PortalStyleSportsArcade.jsx | `style-sports-arcade` | 街机�?|
| PortalStyleSportsScoreboard.jsx | `style-sports-scoreboard` | 记分牌风 |
| PortalStyleSportsCompatLab.jsx | `style-sports-compat-lab` | 兼容性实验室 |
| PortalStyleSportsCompatProbe.jsx | `style-sports-compat-probe` | 兼容性探�?|
| PortalStyleVIP.jsx | `style-vip` | VIP 风格 |
| PortalStylePop.jsx | `style-pop` | 流行�?|
| PortalStyleYouth.jsx | `style-youth` | 年轻�?|
| Home.jsx | `lotto` | 选号主页（使�?html2canvas + cheerio�?|
| Calculator.jsx | `calculator` | 计算�?|
| ScratchCard.jsx | `scratch` | 刮刮卡游�?|
| StorePortal.jsx | �?| **未路�?*，独立门店门户原型（�?mock 数据�?|

**共享工具�?* `src/pages/portalSportsShared.js` 提供运势计算 `getDailyFortune()` + mock 数据常量

---

## 23. 后端爬虫模块详细说明

### 23.1 server/crawler.js（主爬虫�?
**导出�?* `{ runAllCrawlers, crawlScratchCards, stitchParts, SCRATCH_IMG_DIR }`

| 函数 | 说明 |
|------|------|
| `runAllCrawlers(historySize)` | 抓取开奖数�?+ 公益金数据（国家 + 福建�?|
| `crawlScratchCards(faceValue)` | 爬取指定面值的顶呱刮票面图�?|
| `stitchParts(browser, parts, name, direction)` | �?Puppeteer 合成票面多段截图（纵�?横向拼接�?|
| `SCRATCH_IMG_DIR` | 合成图存放路径：`server/scratch_images/` |

**数据来源�?*
- 国家体彩 API：`webapi.sporttery.cn`（开�?+ 公益金）
- 福建体彩网：`fjtc.com.cn`（福建地方彩种）
- 彩种覆盖：超级大乐透、排�?、排�?、七星彩�?6�?�?1�?�?1�?附加�?2�?

### 23.2 server/drawHistory.js（历史开奖）

**导出�?* `{ fetchAllDrawHistories }`

- 使用 axios + 自定�?httpsAgent（`rejectUnauthorized: false`�?- 维护两个 HTTP 客户端实例：`nationalClient`（国家体彩）�?`fjClient`（福建体彩）
- 支持 8 种彩种的历史开奖批量抓�?
### 23.3 server/puppeteerCrawler.js（福�?Puppeteer 爬虫�?
**导出�?* `{ fetchFujianDraws }`

- 使用 Puppeteer 无头浏览器抓取福建体彩网
- **可选模�?*：`crawler.js` 自动检测其存在性，缺失时降级为静�?mock 数据
- 包含 8 种福�?全国彩种的开奖时间配置（`FUJIAN_GAMES`�?
### 23.4 server/crawlerFortune.js（运势爬虫）

**导出�?* `{ fetchAllFortune }`

- 使用 axios + cheerio 抓取运势网站
- 12 生肖 + 12 星座运势数据
- 内置中文颜色�?�?HEX 映射表（`getStandardHex()`�?- 生肖映射（shu→鼠、niu→牛...�? 星座映射（aries→白羊座...�?
### 23.5 测试/调试脚本（server/ 目录�?
| 文件 | 用�?|
|------|------|
| `test_crawler.js` | 爬虫功能测试 |
| `test_fortune.js` | 运势爬虫测试 |
| `test_draw_history.js` | 历史开奖测�?|
| `test_puppeteer.js` | Puppeteer 基础测试 |
| `test_scratch_crawl.js` | 刮刮卡爬取测�?|
| `test_stitch.js` / `test_parts.js` | 图片合成测试 |
| `debug_crawler.js` / `debug_crawl.js` | 爬虫调试 |
| `debug_fortune_live.js` | 运势实时调试 |
| `patch_index.js` / `patch_heartbeat.js` | 数据库补丁脚�?|
| `dump_html.js` / `dump_detail.js` / `dump_204.js` | 页面内容 dump |
| `v.json` / `h.json` / `dump204.json` | 调试数据快照 |

> 以上测试/调试文件共约 20 个，均为开发辅助，不影响生产运行�?
---

## 24. 后端常量与默认�?
> `server/index.js` line 291-299

| 常量 | �?| 用�?|
|------|----|------|
| `FUJIAN_CITIES` | ['福州','厦门','莆田','三明','泉州','漳州','南平','龙岩','宁德'] | 福建城市列表（公�?scope 校验�?|
| `DEFAULT_MANAGER_TITLE_TEMPLATES` | ['店长','先生','女士'] | 称呼模板默认�?|
| `DEFAULT_ANNOUNCEMENT_TAGS` | [{name:'全省投放',color:'rgb(249,115,22)'}, ...] | 默认公告标签（全省投�?+ 4 个城市） |
| `DEFAULT_WINNER_SENSITIVE_WORDS` | ['必中','保中','稳赚','包赚','内幕','代投','返利'] | 默认敏感�?|
| `SCRATCH_TIERS` | {10:{label:'10�?,maxCount:60}, 20:{...}, 30:{...}, 50:{...}} | 刮刮卡档位配�?|

---

## 25. 项目根目录配置文件清�?
| 文件 | 用�?|
|------|------|
| `package.json` | 前端依赖 + scripts |
| `server/package.json` | 后端依赖 + scripts |
| `vite.config.js` | Vite 构建配置 |
| `capacitor.config.json` | Android APK 壳配�?|
| `tailwind.config.js` | Tailwind CSS 配置 |
| `postcss.config.js` | PostCSS 配置 |
| `index.html` | SPA 入口 HTML |
| `src/main.jsx` | React 入口 + ErrorBoundary |
| `src/App.jsx` | 路由定义 |
| `src/index.css` | 全局 CSS（Tailwind + html2canvas 兼容主题变量�?|
| `src/App.css` | 遗留 Vite 模板样式（大部分未使用） |
| `_cleanup_backup/` | 2026-04-16 清理备份（含 README.txt 映射表） |

---

*文档结束*
