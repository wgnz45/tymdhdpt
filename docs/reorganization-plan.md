# 项目目录重构方案

**版本**: 1.0  
**日期**: 2026-06-04  
**状态**: 待审批

---

## 一、现状问题

### 1.1 根目录混乱

根目录存在 **67 个条目**，包含散落的图片、HTML、脚本、日志、临时文件，不符合标准项目结构。

**根目录散落文件清单**：

| 类型 | 文件 | 问题 |
|------|------|------|
| 游戏HTML | `flappy-bird.html`、`lianliankan.html`、`xiaoxiaole.html`、`games-index.html` | 与 `games/` 和 `public/` 重复 |
| Logo图片 | `logo_dlt.png`、`logo_7xc.png`、`logo_pl3.png`、`logo_pl5.png`、`logo_jc.png`、`logo_36x7.png`、`竞彩.png` | 应归入 `src/assets/` 或 `public/` |
| 设计素材 | `ChatGPT Image *.png`、`image.png`、`体彩大头贴2.png` | 应归入 `docs/design/` 或归档 |
| 构建产物 | `体彩门店互动平台-deploy.tar` | 应在 `.gitignore` 中排除 |
| 日志文件 | `server_debug.log`、`server_err.log`、`server_out.log` | 应在 `.gitignore` 中排除 |
| 脚本 | `deploy-games.ps1`、`deploy.sh`、`start-backend.bat`、`start-frontend.bat`、`restart_services.bat` | 应归入 `scripts/` |
| 构建脚本 | `_gen_v2.cjs`、`_organize_games.cjs`、`build_llk_v2.cjs`、`new_render.js` | 应归入 `scripts/` 或归档 |
| 临时文件 | `xiaoxiaole_temp_drawSoundBtn.txt`、`_types_data.txt`、`npm` | 应删除或归档 |
| 配置 | `体彩门店互动平台.code-workspace` | 应归入 `.vscode/` |

### 1.2 游戏资源重复

游戏素材同时存在于 **3 个位置**：

```
根目录/管道/                    ← 设计原始素材（7个管道PNG）
根目录/小鸟素材/                ← 设计原始素材（10个按钮PNG）
根目录/小鸟海报/                ← 设计原始素材（5个海报PNG）
根目录/连连看素材/              ← 设计原始素材（7个图标PNG）
根目录/互动logo/                ← 设计原始素材（6个LogoPNG）

games/flappy-bird/              ← 游戏运行资源（已复制一份）
games/lianliankan/              ← 游戏运行资源（已复制一份）
games/xiaoxiaole/               ← 游戏运行资源

public/                         ← 又有一份HTML副本
```

### 1.3 游戏HTML重复

同一游戏存在 **3 份 HTML**：

| 游戏 | 根目录 | public/ | games/ |
|------|--------|---------|--------|
| 连连看 | `lianliankan.html` | `public/lianliankan.html` | `games/lianliankan/index.html` |
| 消消乐 | `xiaoxiaole.html` | `public/xiaoxiaole.html` | `games/xiaoxiaole/index.html` |
| 小鸟快飞 | `flappy-bird.html` | `public/flappy-bird.html` | `games/flappy-bird/index.html` |

### 1.4 中文命名目录

根目录使用中文命名，不利于跨平台兼容和脚本处理：
- `管道/`、`互动logo/`、`连连看素材/`、`小鸟海报/`、`小鸟素材/`

### 1.5 归档目录不规范

`_archive/` 包含 `backup/`、`legacy_frontend/`、`misc/`、`scripts/`、`server_debug/`、`temp/`，层级深且内容杂。

---

## 二、重构目标

1. 根目录只保留项目配置和入口文件
2. 消除资源重复，每个文件只存在一份
3. 统一英文命名，兼容跨平台
4. 游戏资源独立管理，便于维护
5. 设计素材与运行资源分离
6. 构建产物、日志、临时文件全部 gitignore

---

## 三、目标目录结构

```
体彩门店互动平台/
├── .github/                          # CI/CD
│   └── workflows/
│       └── fetch-lottery.yml
│
├── .vscode/                          # IDE 配置
│   └── settings.json                 # (原 体彩门店互动平台.code-workspace)
│
├── android/                          # Capacitor Android 工程（不动）
│
├── deploy/                           # 部署配置
│   ├── nginx.conf
│   ├── setup.sh
│   └── scripts/                      # (原根目录的 .bat/.sh/.ps1)
│       ├── start-backend.bat
│       ├── start-frontend.bat
│       ├── restart_services.bat
│       ├── deploy.sh
│       └── deploy-games.ps1
│
├── docs/                             # 文档
│   ├── architecture/                 # 架构设计
│   │   ├── architecture-plan.md
│   │   └── root_redesign_plan_utf8.md
│   ├── guides/                       # 操作指南
│   │   ├── APK_BUILD_GUIDE.md
│   │   └── PHOTO_STICKER_APK.md
│   ├── prd/                          # 产品文档
│   │   ├── prd_cn.md
│   │   ├── prd_current.md
│   │   ├── product_progress_customer.md
│   │   ├── 软件平台与后台功能说明.md
│   │   └── interactive_screen_service.md
│   ├── design/                       # 设计稿与原型
│   │   ├── mockups/
│   │   ├── 安卓pad.txt
│   │   └── 文档.md
│   ├── audit/                        # 审计文档
│   │   └── admin-backend-full-audit.md
│   └── superpowers/                  # 开发流程文档
│
├── games/                            # 互动游戏（独立HTML游戏）
│   ├── flappy-bird/
│   │   ├── index.html                # 唯一副本
│   │   └── assets/                   # 游戏专用素材
│   │       ├── pipes/                # (原 管道/)
│   │       ├── sprites/              # (原 小鸟素材/)
│   │       ├── posters/              # (原 小鸟海报/)
│   │       └── ui/                   # 按钮、弹窗等UI素材
│   ├── lianliankan/
│   │   ├── index.html
│   │   └── assets/                   # (原 连连看素材/)
│   ├── xiaoxiaole/
│   │   ├── index.html
│   │   └── assets/
│   └── README.md                     # 游戏清单与接入说明
│
├── public/                           # Vite 静态资源（构建时原样复制）
│   ├── data.json                     # 开奖数据
│   ├── uploads/                      # 运行时上传文件
│   └── vite.svg
│
├── requirement/                      # 需求文档
│   ├── templates/
│   └── v1.0/
│
├── scripts/                          # 构建与工具脚本
│   ├── _gen_v2.cjs
│   ├── _organize_games.cjs
│   ├── build_llk_v2.cjs
│   ├── new_render.js
│   └── fetch_dlt.cjs                 # GitHub Actions 用
│
├── server/                           # 后端服务
│   ├── index.js
│   ├── auth.js
│   ├── rbac.js
│   ├── db.js
│   ├── crawler.js
│   ├── crawlerFortune.js
│   ├── drawHistory.js
│   ├── puppeteerCrawler.js
│   ├── certs/
│   ├── scratch_images/
│   ├── db.sqlite
│   ├── db.json                       # 旧版兼容，迁移后可删
│   ├── package.json
│   └── package-lock.json
│
├── src/                              # 前端源码
│   ├── admin/                        # 管理后台
│   ├── assets/                       # 静态资源（Logo等）
│   │   ├── logo_dlt.png              # (合并根目录散落的Logo)
│   │   ├── logo_7xc.png
│   │   ├── logo_pl3.png
│   │   ├── logo_pl5.png
│   │   ├── logo_jc.png
│   │   ├── logo_36x7.png
│   │   ├── 竞彩.png
│   │   ├── 体彩logo.png
│   │   ├── 门店客服.png
│   │   └── react.svg
│   ├── components/
│   ├── games/                        # React 游戏组件
│   │   ├── flappy/
│   │   └── penalty/
│   ├── hooks/
│   ├── pages/
│   ├── test/
│   ├── utils/
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── tests/                            # 单元测试
│
├── .gitignore                        # Git 忽略规则
├── capacitor.config.json
├── eslint.config.js
├── index.html                        # Vite 入口
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── vitest.config.js
└── README.md
```

---

## 四、迁移操作清单

### 4.1 删除根目录散落文件

**删除（已在其他位置有副本或为临时文件）**：
```
- flappy-bird.html            → games/flappy-bird/index.html
- lianliankan.html            → games/lianliankan/index.html
- xiaoxiaole.html             → games/xiaoxiaole/index.html
- games-index.html            → 删除（无用）
- xiaoxiaole_temp_drawSoundBtn.txt → 删除（临时）
- _types_data.txt             → 删除（临时）
- npm                         → 删除（空文件）
- image.png                   → 删除或移入 docs/design/
- ChatGPT Image *.png         → 删除或移入 docs/design/
- 体彩大头贴2.png             → 删除或移入 docs/design/
- 体彩门店互动平台-deploy.tar            → 删除（构建产物）
- server_debug.log            → 删除（日志）
- server_err.log              → 删除（日志）
- server_out.log              → 删除（日志）
```

**移动到 `src/assets/`**：
```
- logo_dlt.png
- logo_7xc.png
- logo_pl3.png
- logo_pl5.png
- logo_jc.png
- logo_36x7.png
- 竞彩.png
```

**移动到 `deploy/scripts/`**：
```
- start-backend.bat
- start-frontend.bat
- restart_services.bat
- deploy.sh
- deploy-games.ps1
```

**移动到 `scripts/`**：
```
- _gen_v2.cjs
- _organize_games.cjs
- build_llk_v2.cjs
- new_render.js
```

**移动到 `.vscode/`**：
```
- 体彩门店互动平台.code-workspace → .vscode/settings.json
```

### 4.2 整合游戏素材

**合并中文目录到 `games/*/assets/`**：

| 原路径 | 目标路径 |
|--------|----------|
| `管道/*.png` | `games/flappy-bird/assets/pipes/` |
| `小鸟素材/*.png` | `games/flappy-bird/assets/sprites/` |
| `小鸟海报/*.png` | `games/flappy-bird/assets/posters/` |
| `连连看素材/*.png` | `games/lianliankan/assets/` |
| `互动logo/*.png` | `src/assets/game-logos/` |

**删除根目录中文目录**（迁移完成后）：
```
- 管道/
- 小鸟素材/
- 小鸟海报/
- 连连看素材/
- 互动logo/
- xiaoxiaole/              ← 空目录
```

### 4.3 消除 public/ 中的游戏HTML重复

`public/` 中的游戏 HTML 是 Vite 静态资源，构建时原样复制到 `dist/`。
`games/` 中的是游戏原始资源目录。

**决策**：
- `public/` 保留 HTML 副本（Vite 需要）
- `games/` 作为游戏资源的 **source of truth**
- 通过脚本从 `games/` 同步到 `public/`

或者更简洁的方案：
- **游戏 HTML 只保留在 `games/` 目录**
- `public/` 中删除游戏 HTML
- 修改 Vite 配置，将 `games/` 目录也作为静态资源目录

### 4.4 更新 .gitignore

```gitignore
# 构建产物
dist/
体彩门店互动平台-deploy.tar

# 日志
*.log
server_debug.log
server_err.log
server_out.log

# 临时文件
tmp/
*.tmp
*_temp_*

# 上传文件（可选，根据部署策略）
# uploads/

# Android 构建产物
android/app/build/
android/.gradle/
android/.idea/

# 归档（开发过程中产生的历史文件）
_archive/
```

---

## 五、影响分析

### 5.1 需要修改的配置文件

| 文件 | 修改内容 |
|------|----------|
| `vite.config.js` | 如需将 `games/` 作为静态资源目录 |
| `.gitignore` | 添加新的忽略规则 |
| `package.json` | scripts 中的路径更新 |
| `server/index.js` | 如有引用根目录散落文件的路径 |
| `.github/workflows/fetch-lottery.yml` | 如引用了 `fetch_dlt.cjs` 路径 |

### 5.2 需要更新的文档

| 文档 | 更新内容 |
|------|----------|
| `README.md` | 更新项目结构说明 |
| `requirement/v1.0/02-功能说明.md` | 更新游戏资源路径 |
| `docs/APK_BUILD_GUIDE.md` | 如有引用散落文件路径 |

### 5.3 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 游戏HTML路径变更导致iframe加载失败 | 中 | 更新 `FlappyBirdRoute.jsx` 中的路径 |
| Logo图片路径变更导致前端引用失败 | 低 | 检查 `src/assets/` 中的 import 路径 |
| 部署脚本路径变更 | 低 | 更新 CI/CD 和启动脚本 |

---

## 六、执行计划

| 阶段 | 操作 | 预计耗时 |
|------|------|----------|
| 1 | 创建新目录结构 | 5 分钟 |
| 2 | 移动散落文件到对应目录 | 15 分钟 |
| 3 | 整合游戏素材到 `games/*/assets/` | 10 分钟 |
| 4 | 删除根目录中文目录和重复文件 | 5 分钟 |
| 5 | 更新 `.gitignore` | 2 分钟 |
| 6 | 更新 `vite.config.js`（如需要） | 5 分钟 |
| 7 | 更新前端引用路径 | 15 分钟 |
| 8 | 更新部署脚本路径 | 5 分钟 |
| 9 | 验证构建和运行 | 10 分钟 |
| **合计** | | **约 70 分钟** |

---

## 七、待确认事项

1. `public/` 中的游戏 HTML 是否需要保留？（Vite 构建需要，还是通过 iframe 加载 `games/` 目录？）
2. `_archive/` 目录是否需要保留？还是直接删除？
3. `demos/` 目录（3个刮刮卡demo HTML）是否需要保留？
4. 设计素材（ChatGPT Image 等）是删除还是归档？
5. `uploads/` 目录是否纳入版本控制？

---

**文档结束**
