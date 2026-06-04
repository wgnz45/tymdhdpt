# 体彩门店互动平台

面向福建省体彩门店的数字化互动平台，提供内容运营、互动小游戏、开奖信息展示和统一管理后台。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + Vite 7 + Tailwind CSS 4 |
| 后端 | Express 5 + SQLite (better-sqlite3) |
| 移动端 | Capacitor 8 (Android APK) |
| 认证 | JWT + bcrypt + RBAC |

## 快速启动

```bash
# 安装依赖
npm install

# 启动前端开发服务器
npm run dev

# 启动后端服务
npm run server

# 构建生产版本
npm run build

# 构建 Android APK
npm run apk:sync
npm run apk:debug
```

## 项目结构

```
├── src/                  # 前端源码
│   ├── admin/            # 管理后台
│   ├── pages/            # 门店门户页面（9种风格）
│   ├── games/            # 互动游戏组件
│   ├── components/       # 公共组件
│   ├── hooks/            # 自定义 Hooks
│   └── utils/            # 工具函数
├── server/               # 后端服务
│   ├── index.js          # API 主入口
│   ├── auth.js           # JWT 认证
│   ├── rbac.js           # RBAC 权限管理
│   ├── db.js             # SQLite 数据库
│   └── crawler*.js       # 数据爬虫
├── public/
│   └── games/            # 互动游戏（独立 HTML）
├── android/              # Capacitor Android 工程
├── docs/                 # 项目文档
├── requirement/          # 需求文档
├── deploy/               # 部署配置
└── tests/                # 单元测试
```

## 功能模块

- **门店门户** — 9 种风格主题的门店展示页面
- **大乐透选号** — 模拟选号（机选/自选/套餐）
- **顶呱刮抽票** — 模拟刮刮卡抽票体验
- **互动游戏** — 点球大战、小鸟快飞、连连看、消消乐
- **大头贴拍照** — 中奖拍照纪念
- **开奖信息** — 全国 + 福建地方彩种实时开奖
- **管理后台** — 门店/内容/数据/权限统一管理
- **数据爬虫** — 自动抓取体彩官方数据

## 部署

详见 [deploy/](./deploy/) 目录和 [docs/APK_BUILD_GUIDE.md](./docs/APK_BUILD_GUIDE.md)。
