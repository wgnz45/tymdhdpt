# 福建体彩门店数字化平台 — 二级等保 + 6000 店并发 完整改造方案

> **版本**: v1.0  
> **日期**: 2026-04-27  
> **状态**: 方案设计阶段

---

## 目录

- [一、现状分析](#一现状分析)
- [二、目标架构](#二目标架构)
- [三、二级等保合规清单](#三二级等保合规清单)
- [四、技术改造详细方案](#四技术改造详细方案)
  - [4.1 数据库迁移 SQLite → MySQL](#41-数据库迁移-sqlite--mysql)
  - [4.2 Redis 缓存层](#42-redis-缓存层)
  - [4.3 OSS + CDN 图片迁移](#43-oss--cdn-图片迁移)
  - [4.4 PM2 集群模式](#44-pm2-集群模式)
  - [4.5 去除 Puppeteer](#45-去除-puppeteer)
  - [4.6 Nginx 配置](#46-nginx-配置)
  - [4.7 安全加固中间件](#47-安全加固中间件)
- [五、性能验证](#五性能验证)
- [六、新增模块设计](#六新增模块设计)
  - [6.1 server/mysql.js](#61-servermysqljs)
  - [6.2 server/redis.js](#62-serverredisjs)
  - [6.3 server/ossUploader.js](#63-serverossuploaderjs)
  - [6.4 server/security.js](#64-serversecurityjs)
- [七、现有文件改造清单](#七现有文件改造清单)
- [八、部署配置文件](#八部署配置文件)
- [九、数据迁移脚本](#九数据迁移脚本)
- [十、依赖变更](#十依赖变更)
- [十一、监控备份日志](#十一监控备份日志)
- [十二、压力测试方案](#十二压力测试方案)
- [十三、等保文档清单](#十三等保文档清单)
- [十四、回滚方案](#十四回滚方案)
- [十五、实施排期与费用](#十五实施排期与费用)

---

## 一、现状分析

### 1.1 当前技术栈

| 层级 | 技术 | 问题 |
|------|------|------|
| 前端 | React + Vite + TailwindCSS | ✅ 无重大问题 |
| 后端 | Express 单进程（3129 行 index.js） | ❌ 单线程、无集群 |
| 数据库 | SQLite（better-sqlite3） | ❌ 单写锁、无认证 |
| 爬虫 | Puppeteer + Cheerio + Axios | ❌ Puppeteer 内存重 |
| 认证 | JWT + bcrypt + 登录锁定 | ⚠️ 基本满足 |
| RBAC | 角色/部门/权限/审计日志 | ✅ 已有框架 |
| 文件 | 8 个 JS 模块，all-in-one 部署 | ❌ 无法水平扩展 |

### 1.2 数据库表（16 张）

| 表 | 数据特征 | 迁移复杂度 |
|----|---------|-----------|
| `super_config` | 单行 JSON | 低 |
| `stores` | 6000+ 行，含 Base64 图片 | **高** |
| `tickets` | 彩票订单，高写入 | 中 |
| `analytics` | 门店统计 | 低 |
| `central_announcements` | 公告 JSON | 低 |
| `scratch_library` | 刮刮乐库，含 Base64 | **高** |
| `layout_library` | 素材库，含 Base64 | **高** |
| `carousel_library` | 轮播图库，含 Base64 | **高** |
| `sources` | 爬虫数据缓存 | 低 |
| `fortune_data` | 运势数据 | 低 |
| `draw_history` | 开奖历史 | 低 |
| `store_logs` | 门店日志 | 中 |
| `departments` | 组织架构 | 低 |
| `roles` | 角色定义 | 低 |
| `admin_users` | 管理员账号 | 低 |
| `admin_logs` | 操作审计 | 中 |

### 1.3 API 接口并发压力

| 模块 | 接口数 | 并发压力 |
|------|--------|---------|
| 门店前端数据 | ~10 | **极高**（6000 店轮询） |
| 门店配置管理 | ~8 | 中 |
| 素材/刮刮乐/轮播 | ~15 | 低（管理操作） |
| RBAC 认证 | ~12 | 低 |
| 信源/爬虫 | ~5 | 低（定时任务） |
| 公告/喜报 | ~8 | 低 |
| 彩票投注 | ~5 | 中 |

### 1.4 图片/静态资源现状

| 类型 | 位置 | 文件数 | 大小 | 存储方式 |
|------|------|--------|------|----------|
| 前端 JS/CSS/图片 | `dist/assets/` | 94 个 | 2.7MB | 文件系统，Express 直出 |
| 刮刮乐合成图 | `server/scratch_images/` | 51 个 | 8MB | 文件系统，API 路由返回 |
| 素材库图片 | `db.sqlite` 内 | 不定 | 不定 | **Base64 存数据库** |
| 轮播图/刮刮乐票面 | `db.sqlite` 内 | 不定 | 不定 | **Base64 存数据库** |

---

## 二、目标架构

```
                    ┌──────────────────────────┐
                    │    6000+ 门店终端         │
                    │  (安卓盒子/浏览器/APP)     │
                    └─────┬──────────┬─────────┘
                          │          │
                   静态资源      API/WebSocket
                          │          │
                          ▼          ▼
              ┌───────────────┐  ┌──────────────────────┐
              │  阿里云 CDN    │  │  Nginx (HTTPS终止)    │
              │  cdn.xxx.com  │  │  api.xxx.com          │
              │  全国加速      │  │  负载均衡 + gzip      │
              └───────┬───────┘  └──────────┬───────────┘
                      │                      │
              ┌───────▼───────┐    ┌─────────▼──────────────────┐
              │  阿里云 OSS    │    │    应用服务器 (8C 16G)       │
              │  对象存储       │    │                             │
              │  - 前端静态    │    │  PM2 Cluster × 8 进程       │
              │  - 素材图片    │    │  ┌─────┐ ┌─────┐ ┌─────┐  │
              │  - 刮刮乐图片  │    │  │ #1  │ │ #2  │ │...#8│  │
              └───────────────┘    │  └──┬──┘ └──┬──┘ └──┬──┘  │
                                   │     └───────┼───────┘     │
                                   └─────────────┼─────────────┘
                                                 │
                              ┌───────────────────┼────────────────┐
                              │                   │                │
                     ┌────────▼────────┐ ┌───────▼───────┐ ┌─────▼─────┐
                     │  MySQL 8.0      │ │   Redis 7     │ │  OSS SDK  │
                     │  数据库服务器     │ │   缓存/会话    │ │  图片上传  │
                     │  8C 16G 500G    │ │   (同机部署)   │ │           │
                     │  主库 + 只读副本  │ │               │ │           │
                     └─────────────────┘ └───────────────┘ └───────────┘
```

---

## 三、二级等保合规清单

### 3.1 物理安全

| 要求 | 措施 | 状态 |
|------|------|------|
| 机房物理防护 | 使用阿里云（已通过三级等保），物理安全由云厂商保证 | ✅ |
| UPS 电源 | 云服务自带 | ✅ |
| 环境监控 | 云服务自带 | ✅ |

### 3.2 网络安全

| 要求 | 措施 | 负责方 |
|------|------|--------|
| 边界防火墙 | 阿里云安全组：仅开放 443(HTTPS)、22(SSH 限 IP) | 运维 |
| 入侵检测 | 开通云安全中心（基础版免费） | 运维 |
| DDoS 防护 | CDN 自带 + 云盾基础防护 | 自动 |
| HTTPS 全链路 | Nginx SSL 终止 + CDN HTTPS + OSS HTTPS | 开发 |
| 网络隔离 | 数据库仅内网访问，不开放公网 | 运维 |
| VPN 管理 | SSH 密钥登录，禁止密码，限 IP 白名单 | 运维 |

### 3.3 主机安全

| 要求 | 措施 |
|------|------|
| 身份鉴别 | SSH 密钥登录，禁止 root 远程，禁止空密码 |
| 访问控制 | 最小权限：Node 进程用普通用户运行，MySQL 非 root |
| 安全审计 | 开启 syslog + auditd，保留 180 天 |
| 入侵防范 | 关闭不必要端口/服务，安装云安全 agent |
| 恶意代码防范 | 安装阿里云安骑士 |
| 资源控制 | PM2 设置内存上限，MySQL 配置连接数上限 |

### 3.4 应用安全

| 要求 | 当前状态 | 改造措施 |
|------|---------|---------|
| 身份认证 | ✅ JWT + bcrypt | 增加：密码过期策略（90 天） |
| 密码策略 | ✅ ≥8位，含字母+数字 | 增加：禁止最近 5 次使用过的密码 |
| 登录失败锁定 | ✅ 5 次锁定 30 分钟 | 满足 |
| 访问控制 | ✅ RBAC 权限体系 | 满足 |
| 审计日志 | ✅ admin_logs 表 | 增加：日志保留 180 天策略 |
| 通信加密 | ❌ 当前 HTTP | **改造：全站 HTTPS** |
| 输入验证 | ⚠️ 部分有 | **增加：全局 XSS/SQL 注入防护中间件** |
| 会话管理 | ✅ JWT 8h 过期 | 增加：并发登录限制（同账号最多 2 个会话） |
| 数据脱敏 | ❌ 无 | 增加：手机号展示脱敏（138****1234） |

### 3.5 数据安全

| 要求 | 措施 |
|------|------|
| 数据备份 | MySQL 每日全量备份 + binlog 增量，保留 30 天 |
| 异地备份 | 备份文件同步到 OSS 另一区域 |
| 数据完整性 | MySQL InnoDB 事务 + 外键约束 |
| 传输加密 | 应用 → MySQL 走 SSL 连接 |
| 存储加密 | MySQL TDE 透明数据加密（敏感表） |
| 剩余信息保护 | JWT 注销时加入黑名单（Redis） |
| 个人信息保护 | 手机号加密存储，日志脱敏 |

### 3.6 安全管理

| 要求 | 产出物 |
|------|--------|
| 安全管理制度 | 《信息安全管理制度》文档 |
| 安全责任人 | 指定安全负责人 |
| 应急预案 | 《信息安全应急预案》 |
| 安全培训 | 年度安全培训记录 |
| 变更管理 | 代码上线审批流程 |
| 资产清单 | 服务器、域名、证书、账号清单 |

---

## 四、技术改造详细方案

### 4.1 数据库迁移 SQLite → MySQL

#### MySQL 表结构设计

```sql
-- 超级管理配置
CREATE TABLE super_config (
    id INT PRIMARY KEY DEFAULT 1,
    super_key VARCHAR(128) NOT NULL,
    cron_config JSON,
    draw_history_size INT DEFAULT 6,
    scroll_hold_ms INT DEFAULT 3000,
    draw_logo_map JSON,
    draw_logo_opacity DECIMAL(3,2) DEFAULT 0.18,
    log_retention_days INT DEFAULT 30,
    winner_center JSON,
    sensitive_words JSON,
    manager_title_templates JSON,
    wechat_config JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 门店（核心表，6000+ 行）
CREATE TABLE stores (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL DEFAULT '',
    city VARCHAR(32) DEFAULT '',
    admin_key VARCHAR(128) NOT NULL,
    channel VARCHAR(32) DEFAULT 'web',
    phone VARCHAR(20) DEFAULT '',
    manager VARCHAR(32) DEFAULT '',
    qr_code VARCHAR(512) DEFAULT '',
    config JSON,
    winner_reports JSON,
    features JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_city (city),
    INDEX idx_channel (channel)
) ENGINE=InnoDB;

-- 彩票（高写入）
CREATE TABLE tickets (
    id VARCHAR(64) PRIMARY KEY,
    store_id VARCHAR(64) NOT NULL,
    period VARCHAR(32) NOT NULL DEFAULT '',
    mode VARCHAR(16) NOT NULL DEFAULT 'regular',
    type VARCHAR(16) NOT NULL DEFAULT 'single',
    numbers JSON NOT NULL,
    count INT NOT NULL DEFAULT 1,
    price INT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    win_amount INT NOT NULL DEFAULT 0,
    win_level JSON,
    INDEX idx_store (store_id),
    INDEX idx_period (period),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- 素材库（图片改为 OSS URL）
CREATE TABLE layout_library (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL DEFAULT '',
    type VARCHAR(32) DEFAULT 'other',
    url VARCHAR(512) NOT NULL DEFAULT '',
    created_at BIGINT,
    updated_at BIGINT
) ENGINE=InnoDB;

-- 刮刮乐库
CREATE TABLE scratch_library (
    id VARCHAR(64) PRIMARY KEY,
    tier INT NOT NULL DEFAULT 10,
    name VARCHAR(128) NOT NULL DEFAULT '',
    url VARCHAR(512) DEFAULT '',
    front_url VARCHAR(512) DEFAULT '',
    back_url VARCHAR(512) DEFAULT '',
    scratch_face_url VARCHAR(512) DEFAULT '',
    intro TEXT,
    max_prize VARCHAR(64) DEFAULT '',
    enabled TINYINT(1) DEFAULT 1,
    created_at BIGINT,
    updated_at BIGINT,
    INDEX idx_tier (tier)
) ENGINE=InnoDB;

-- 轮播图库
CREATE TABLE carousel_library (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) DEFAULT '',
    url VARCHAR(512) NOT NULL DEFAULT '',
    title VARCHAR(256) DEFAULT '',
    sub VARCHAR(256) DEFAULT '',
    badge VARCHAR(64) DEFAULT '',
    level VARCHAR(16) DEFAULT 'province',
    cities JSON,
    enabled TINYINT(1) DEFAULT 1,
    priority INT DEFAULT 0,
    duration INT DEFAULT 5000,
    created_at BIGINT,
    INDEX idx_level (level),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB;

-- 公告
CREATE TABLE central_announcements (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(256) DEFAULT '',
    content TEXT,
    type VARCHAR(32) DEFAULT 'info',
    tags JSON,
    priority INT DEFAULT 0,
    enabled TINYINT(1) DEFAULT 1,
    created_at BIGINT,
    updated_at BIGINT
) ENGINE=InnoDB;

-- 门店统计
CREATE TABLE analytics (
    store_id VARCHAR(64) PRIMARY KEY,
    click_regular INT DEFAULT 0,
    click_package INT DEFAULT 0,
    share_count INT DEFAULT 0,
    share_amount INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 信源缓存
CREATE TABLE sources_cache (
    id INT PRIMARY KEY DEFAULT 1,
    data MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 运势数据
CREATE TABLE fortune_cache (
    id INT PRIMARY KEY DEFAULT 1,
    data MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 开奖历史
CREATE TABLE draw_history_cache (
    id INT PRIMARY KEY DEFAULT 1,
    data MEDIUMTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 门店日志
CREATE TABLE store_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_id VARCHAR(64) NOT NULL,
    event VARCHAR(64) NOT NULL,
    detail TEXT DEFAULT '',
    created_at BIGINT NOT NULL,
    INDEX idx_store (store_id),
    INDEX idx_time (created_at)
) ENGINE=InnoDB;

-- 密码历史（等保要求）
CREATE TABLE password_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    created_at BIGINT NOT NULL,
    INDEX idx_user (user_id)
) ENGINE=InnoDB;
```

> 注：`departments`、`roles`、`admin_users`、`admin_logs` 表结构保持不变。

#### MySQL 安全配置（等保必须）

```ini
# /etc/mysql/conf.d/security.cnf
[mysqld]
validate_password.policy = MEDIUM
validate_password.length = 8
require_secure_transport = ON
max_connections = 300
max_connect_errors = 10
general_log = ON
general_log_file = /var/log/mysql/general.log
slow_query_log = ON
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 1
binlog_expire_logs_seconds = 2592000
server-id = 1
log-bin = mysql-bin
```

#### 数据库连接池配置

```javascript
// server/mysql.js — 每进程 20 连接，8 进程共 160
const pool = mysql.createPool({
    host: process.env.DB_HOST || '172.16.0.x',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || '体彩门店互动平台_app',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || '体彩门店互动平台',
    ssl: { rejectUnauthorized: true },
    connectionLimit: 20,
    charset: 'utf8mb4',
    timezone: '+08:00',
});
```

### 4.2 Redis 缓存层

#### 缓存策略

| 数据 | Key 格式 | TTL | 说明 |
|------|---------|-----|------|
| 门店配置 | `store:{id}` | 60s | 6000 店每次请求走缓存 |
| 信源数据 | `sources:latest` | 30s | 所有门店共享同一份 |
| 开奖历史 | `draw_history` | 60s | 高频读取 |
| 运势数据 | `fortune` | 1h | 每天更新一次 |
| 素材库 | `layout_library:all` | 5min | 管理员更新时失效 |
| JWT 黑名单 | `jwt_bl:{hash}` | 8h | 注销/踢出用户 |
| 登录失败计数 | `login_fail:{username}` | 30min | 替代内存 Map |
| 设备心跳 | `device:{storeId}` | 5min | 替代全局变量 |
| 设备指令 | `cmd:{storeId}` | 5min | 替代 pendingCommand |
| 分布式锁 | `lock:{name}` | 60-120s | Cron 去重 |

#### 效果对比

| 指标 | 无缓存 | 有 Redis |
|------|--------|---------|
| `/api/system/sources` 响应 | 50-200ms（查 DB） | **< 5ms** |
| `/api/store/:id` 响应 | 20-50ms | **< 3ms** |
| 数据库 QPS | ~500（瓶颈） | **降至 ~50**（仅缓存 miss） |

### 4.3 OSS + CDN 图片迁移

#### 资源迁移对照表

| 资源类型 | 当前存储 | 迁移到 | CDN 缓存策略 |
|---------|---------|--------|-------------|
| 前端 JS/CSS | `dist/assets/` 文件 | OSS `static/assets/` | 1 年（文件名含 hash） |
| 前端 HTML | `dist/index.html` | 应用服务器（不缓存） | 不走 CDN |
| 素材库图片 | Base64 存 SQLite | OSS `uploads/layout/` | 7 天 |
| 刮刮乐票面 | Base64 存 SQLite | OSS `uploads/scratch/` | 7 天 |
| 刮刮乐合成图 | `scratch_images/` 文件 | OSS `uploads/scratch-gen/` | 7 天 |
| 轮播图 | Base64 存 SQLite | OSS `uploads/carousel/` | 7 天 |

#### 缓存失效对照表

| 写接口 | 需失效的缓存 Key |
|--------|-----------------|
| `layout/upload, update, delete` | `sources:latest`, `layout_library:all` |
| `scratch/upload, update, delete` | `sources:latest`, `scratch_library:all` |
| `carousel/upload, update, delete` | `sources:latest`, `carousel_library:all` |
| `store/update` | `store:{id}` |
| `super/update-config` | `sources:latest`, `super_config` |
| `announcements/*` | `sources:latest` |
| `winner-broadcast` | `store:{id}` (批量) |
| 爬虫/手动更新 | `sources:latest`, `draw_history` |

### 4.4 PM2 集群模式

#### 多进程改造点

| 问题 | 当前 | 改造 |
|------|------|------|
| `global.globalDeviceStatus` | 内存全局变量 | Redis Hash |
| `loginFailMap` | 内存 Map | Redis |
| `wechatToken` | 内存对象 | Redis |
| `pendingCommand` | 内存属性 | Redis `cmd:{storeId}` |
| Cron 重复执行 | 8 进程都会跑 | 分布式锁 + `NODE_APP_INSTANCE === '0'` |

### 4.5 去除 Puppeteer

| 爬虫功能 | 当前方式 | 替代方案 |
|---------|---------|---------|
| 福建体彩开奖 | Puppeteer 无头浏览器 | 纯 HTTP API（已有 `drawHistory.js`） |
| 刮刮乐票面合成 | Puppeteer 截图 | `sharp` 库图片拼接 |
| 刮刮乐官网爬取 | Puppeteer | `cheerio` + `axios` |
| 新闻爬取 | Cheerio（已是纯 HTTP） | 保持不变 |

> 内存节省：Puppeteer ~500MB → sharp ~30MB

### 4.6 Nginx 配置

```nginx
# /etc/nginx/conf.d/体彩门店互动平台.conf

upstream node_cluster {
    least_conn;
    server 127.0.0.1:3366;
    keepalive 64;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/ssl/certs/api.pem;
    ssl_certificate_key /etc/ssl/private/api.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1024;

    # 等保安全头
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # API 限流
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

    # index.html — 不缓存
    location = / {
        root /opt/体彩门店互动平台/dist;
        try_files /index.html =404;
        add_header Cache-Control "no-cache, no-store";
    }

    # 前端静态资源
    location /assets/ {
        root /opt/体彩门店互动平台/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://node_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA 路由
    location / {
        root /opt/体彩门店互动平台/dist;
        try_files $uri /index.html;
    }

    # 日志（等保审计要求）
    access_log /var/log/nginx/体彩门店互动平台_access.log;
    error_log  /var/log/nginx/体彩门店互动平台_error.log;
}
```

### 4.7 安全加固中间件

```javascript
// 安全头、XSS 过滤、限流、请求日志 — 详见 server/security.js
app.use(securityHeaders);
app.use(xssFilter);
app.use(requestLogger);
app.use('/api/', rateLimiter(60000, 120));  // 每 IP 每分钟 120 次

// 请求体大小：从 50mb → 2mb（图片走 OSS）
app.use(express.json({ limit: '2mb' }));
```

---

## 五、性能验证

### 5.1 并发模型计算

| 行为 | 频率 | QPS |
|------|------|-----|
| 心跳上报 | 6000 店 × 每 30s | 200/s |
| 信源数据轮询 | 6000 店 × 每 3min | 33/s |
| 门店配置加载 | 6000 店 × 每 5min | 20/s |
| 管理员操作 | ~50 人同时 | ~5/s |
| **总计** | — | **~258/s** |

### 5.2 处理能力评估

| 组件 | 单实例 QPS | 集群 QPS | 余量 |
|------|-----------|---------|------|
| Nginx | 50,000+ | 50,000+ | ✅ 充裕 |
| Node.js × 8 | ~500/进程 | **~4,000** | ✅ 15x 余量 |
| Redis | 100,000+ | 100,000+ | ✅ 充裕 |
| MySQL (读) | ~5,000 | ~5,000 | ✅ 有 Redis 挡 |
| MySQL (写) | ~2,000 | ~2,000 | ✅ 写入量低 |

### 5.3 带宽计算（CDN 后）

| 流量 | 计算 | 走源站？ |
|------|------|---------|
| JS/CSS/图片 | 0 | ❌ 走 CDN |
| API 响应 | 258/s × 5KB = 1.3MB/s = **10.4Mbps** | ✅ |

> **10Mbps 带宽 + CDN 方案可支撑 6000 店。建议升到 20Mbps 留余量。**

---

## 六、新增模块设计

### 6.1 server/mysql.js

MySQL 连接池封装，每进程 20 连接，8 进程共 160。

```javascript
const mysql = require('mysql2/promise');

let pool = null;

function initMySQL() {
    pool = mysql.createPool({
        host:     process.env.DB_HOST || '127.0.0.1',
        port:     Number(process.env.DB_PORT) || 3306,
        user:     process.env.DB_USER || '体彩门店互动平台_app',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || '体彩门店互动平台',
        charset:  'utf8mb4',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 100,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 10000,
    });
    return pool;
}

function getPool() {
    if (!pool) throw new Error('MySQL not initialized');
    return pool;
}

module.exports = { initMySQL, getPool };
```

### 6.2 server/redis.js

Redis 客户端 + 缓存层 + 设备状态 + 登录计数 + JWT 黑名单 + 分布式锁。

功能清单：

| 函数 | 用途 |
|------|------|
| `cacheGet(key, ttl, fetchFn)` | 读缓存，miss 时回源 |
| `cacheInvalidate(key)` | 主动失效 |
| `setDeviceStatus(storeId, data)` | 设备心跳写入 |
| `getDeviceStatus(storeId)` | 读设备状态 |
| `getAllOnlineDevices()` | 获取所有在线设备 |
| `setPendingCommand(storeId, cmd)` | 下发指令 |
| `getPendingCommand(storeId)` | 取出指令（取后删除） |
| `getLoginFail(username)` | 读登录失败计数 |
| `setLoginFail(username, data)` | 写登录失败 |
| `clearLoginFail(username)` | 清除失败计数 |
| `blacklistToken(hash, ttl)` | JWT 黑名单 |
| `isTokenBlacklisted(hash)` | 检查 JWT 是否被注销 |
| `acquireLock(name, ttl)` | 分布式锁（Cron 去重） |
| `releaseLock(name)` | 释放锁 |

### 6.3 server/ossUploader.js

阿里云 OSS 上传/删除，替代 Base64 存数据库。

| 函数 | 用途 |
|------|------|
| `initOSS()` | 初始化 OSS 客户端 |
| `uploadBase64(data, folder)` | Base64 → OSS，返回 CDN URL |
| `uploadFile(localPath, ossPath)` | 本地文件 → OSS |
| `deleteFile(cdnUrl)` | 通过 CDN URL 删除 OSS 文件 |
| `isBase64Image(str)` | 判断是否为 Base64 |
| `processImage(input, folder)` | 智能处理：Base64 上传 / URL 透传 |

### 6.4 server/security.js

等保二级安全中间件。

| 函数/中间件 | 用途 |
|------------|------|
| `securityHeaders` | 安全响应头（CSP/HSTS/XSS 等） |
| `xssFilter` | XSS 输入过滤（递归清理请求体） |
| `rateLimiter(windowMs, max)` | 请求频率限制 |
| `requestLogger` | API 请求审计日志 |

---

## 七、现有文件改造清单

### 7.1 server/index.js 改造点

| 改造点 | 行号范围 | 说明 |
|--------|---------|------|
| A. 启动初始化 | 1-18 | 引入新模块，初始化 MySQL/Redis/OSS |
| B. 全局变量 → Redis | 134 | 删除 `global.globalDeviceStatus` |
| C. 安全中间件 | 138-141 | 加安全头/XSS/限流，body limit 50mb→2mb |
| D. 心跳接口 | ~860-911 | `globalDeviceStatus` → Redis |
| E. 指令推送 | ~905-911 | `pendingCommand` → Redis |
| F. 全页面刷新 | ~914-932 | `globalDeviceStatus` → Redis |
| G. 门店列表在线状态 | ~1056-1067 | 从 Redis 读状态 |
| H. 素材上传 | ~943-968, 2280-2298 | Base64 → OSS |
| I. 素材更新 | ~985-1005 | 旧图 OSS 删除 + 新图上传 |
| J. 素材删除 | ~970-983, 2301-2316 | OSS 文件删除 |
| K. 刮刮乐上传 | ~1852-1873 | Base64 → OSS |
| L. 刮刮乐更新 | ~1884-1913 | Base64 → OSS |
| M. 刮刮乐删除 | ~1916-1962 | OSS 文件删除 |
| N. 轮播图上传 | ~2331-2356 | Base64 → OSS |
| O. 轮播图更新 | ~2377-2398 | Base64 → OSS |
| P. 轮播图删除 | ~2358-2374 | OSS 文件删除 |
| Q. 信源接口 | ~2907-2958 | 加 Redis 缓存（30s） |
| R. 所有 getDB() | 全文 ~60 处 | 同步 → async/await |
| S. Cron 任务 | ~2883-2900 | 分布式锁 + Worker 0 |

### 7.2 server/auth.js 改造点

| 改造点 | 说明 |
|--------|------|
| `loginFailMap` → Redis | 内存 Map 改为 Redis |
| `checkLoginLock()` | 改为 async |
| `recordLoginFail()` | 改为 async |
| `verifyToken()` | 增加 JWT 黑名单检查 |
| 新增：`checkPasswordHistory()` | 禁止重复最近 5 次密码 |
| 新增：`recordPasswordHistory()` | 改密时记录历史 |

### 7.3 server/db.js 重写

从 SQLite 全量读写模式 → MySQL 按需查询 + Redis 缓存。

核心变化：

| 旧函数 | 新实现 |
|--------|--------|
| `getDB()` 同步返回全量 | `getDB()` async，按需查询 |
| `saveDB(data)` DELETE+INSERT 全表 | 按行 UPDATE/INSERT |
| `initDatabase()` | 改为 `initMySQL()` + `initRedis()` |

### 7.4 vite.config.js

```javascript
// 增加 CDN base 配置
export default defineConfig(({ mode }) => ({
    base: mode === 'production'
        ? (process.env.CDN_BASE || '/')
        : '/',
    // ... 其余不变
}));
```

---

## 八、部署配置文件

### 8.1 PM2 集群配置

```javascript
// server/ecosystem.config.cjs
module.exports = {
    apps: [{
        name: '体彩门店互动平台',
        script: './server/index.js',
        instances: 8,
        exec_mode: 'cluster',
        max_memory_restart: '1500M',
        env_production: {
            NODE_ENV: 'production',
            PORT: 3366,
        },
        error_file: '/var/log/体彩门店互动平台/error.log',
        out_file: '/var/log/体彩门店互动平台/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        merge_logs: true,
        listen_timeout: 5000,
        kill_timeout: 3000,
    }]
};
```

### 8.2 环境变量模板

```env
NODE_ENV=production
PORT=3366
DB_HOST=172.16.0.100
DB_PORT=3306
DB_USER=体彩门店互动平台_app
DB_PASS=YourStrongPassword123!
DB_NAME=体彩门店互动平台
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
JWT_SECRET=your_random_64char_secret_here
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=体彩门店互动平台-static
OSS_ACCESS_KEY_ID=your_key_id
OSS_ACCESS_KEY_SECRET=your_key_secret
OSS_CDN_BASE=https://cdn.yourdomain.com
```

---

## 九、数据迁移脚本

### 9.1 SQLite → MySQL

```
server/migrate-to-mysql.js
├── 1. 读取 SQLite 全量数据 (旧 getDB())
├── 2. JSON data 列 → 拆分为独立字段
├── 3. 批量写入 MySQL (事务)
├── 4. 验证行数一致
└── 5. 输出迁移报告
```

### 9.2 Base64 → OSS

```
server/migrate-images.js
├── 1. 遍历 layout_library：Base64 → OSS → 更新 URL
├── 2. 遍历 scratch_library：url/front_url/back_url → OSS
├── 3. 遍历 carousel_library：Base64 → OSS
├── 4. 遍历 stores.config：检查内嵌 Base64
└── 5. 输出迁移统计
```

---

## 十、依赖变更

```diff
  "dependencies": {
+   "ali-oss": "^6.20.0",
+   "dotenv": "^16.4.5",
+   "ioredis": "^5.4.1",
+   "mysql2": "^3.11.3",
+   "sharp": "^0.33.5",
-   "puppeteer": "^24.39.0",
  }
```

> 删除 puppeteer (~500MB)，新增 mysql2 + ioredis + ali-oss + sharp + dotenv (~15MB)

---

## 十一、监控备份日志

### 11.1 日志轮转

```
/etc/logrotate.d/体彩门店互动平台
- 保留 180 天（等保要求）
- 每日轮转 + gzip 压缩
- 覆盖 /var/log/体彩门店互动平台/*.log 和 /var/log/nginx/体彩门店互动平台_*.log
```

### 11.2 MySQL 备份

```
每日凌晨 2 点全量备份 (crontab)
├── mysqldump --single-transaction → gzip
├── 上传到 OSS 异地备份桶
└── 清理 30 天前本地备份
```

### 11.3 PM2 监控

```bash
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
pm2 monit    # 实时监控
pm2 logs     # 查看日志
pm2 reload 体彩门店互动平台  # 零停机重启
```

---

## 十二、压力测试方案

使用 k6 模拟 6000 店并发：

```
阶段 1: 0→1000 (1分钟)
阶段 2: 1000→6000 (2分钟)
阶段 3: 持续 6000 (5分钟)
阶段 4: 6000→0 (1分钟)
```

**通过标准**：
- P95 延迟 < 500ms
- 错误率 < 0.1%
- 源站带宽 < 10Mbps

---

## 十三、等保文档清单

| 序号 | 文档 | 负责方 |
|------|------|--------|
| 1 | 《信息安全管理制度》 | 甲方 |
| 2 | 《网络安全拓扑图》 | 开发 |
| 3 | 《服务器安全基线配置表》 | 运维 |
| 4 | 《数据库安全配置表》 | 运维 |
| 5 | 《应用安全设计说明》 | 开发 |
| 6 | 《数据备份恢复方案》 | 运维 |
| 7 | 《应急响应预案》 | 甲方+运维 |
| 8 | 《操作审计日志说明》 | 开发 |
| 9 | 《资产清单》 | 运维 |

---

## 十四、回滚方案

| 阶段 | 回滚方式 |
|------|---------|
| MySQL 迁移后 | SQLite 原文件保留 30 天，切回只需改 `require('./db')` |
| OSS 迁移后 | Base64 数据在 MySQL 中保留副本列，可逆向写回 |
| PM2 集群 | `pm2 delete 体彩门店互动平台 && node server/index.js` 回到单进程 |
| CDN 故障 | Nginx fallback 直接返回本地 `dist/assets/` |
| 整体回滚 | 保留旧版 `server/db.js` + `db.sqlite`，一键切回 |

---

## 十五、实施排期与费用

### 15.1 排期

| 周 | 阶段 | 内容 | 产出 |
|----|------|------|------|
| 第 1 周 | 基础设施 | 域名/SSL、OSS/CDN/MySQL、安全组 | 基础设施就绪 |
| 第 1-2 周 | 数据库 | MySQL 建表、db.js 重写、迁移脚本 | 数据库层完成 |
| 第 2 周 | 缓存 | Redis 安装配置、缓存层、全局变量迁移 | 缓存层完成 |
| 第 2-3 周 | OSS | ossUploader、12 个上传接口改造、历史数据迁移 | 图片存储完成 |
| 第 3 周 | 部署 | Nginx、PM2 集群、Cron 单进程化、去 Puppeteer | 多进程部署完成 |
| 第 3 周 | 安全 | 安全中间件、密码策略、日志保留 | 安全加固完成 |
| 第 4 周 | 前端 | Vite CDN 前缀、构建部署脚本 | 前端 CDN 化完成 |
| 第 4 周 | 测试 | k6 压力测试、等保自查、回归测试 | 上线验证 |

### 15.2 费用

| 项目 | 月费（元） |
|------|-----------|
| 应用服务器 8C16G（已有） | ~800 |
| 数据库服务器 8C16G（已有） | ~800 |
| 域名 + SSL | ~0（免费证书） |
| OSS 存储 10GB | ~1.2 |
| CDN 流量 500GB | ~100-150 |
| Redis（应用服务器自建） | 0 |
| 云安全中心基础版 | 0 |
| **月度增量费用** | **≈ 150 元** |
| **一次性开发工期** | **4 周** |
