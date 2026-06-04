# APK 构建指南（Capacitor）

## 当前配置摘要

| 项目 | 值 |
|------|-----|
| 应用 ID | `cn.体彩门店互动平台.app` |
| 应用名 | `中国体育彩票` |
| 最低支持 | Android 8.0（API 26）|
| 目标 SDK | API 36 |
| 前端打包 | `dist/` 直接打进 APK |
| API 地址（联调）| `http://192.168.15.236:3366`（写死在 `src/main.jsx`）|
| 摄像头 | ✅ 启用（`AndroidManifest.xml`）|
| 文件保存 | ✅ `@capacitor/filesystem` |

---

## 首次构建 APK

### 1. 确保前端已构建并同步

```powershell
npm run build
npx cap sync android
```

> 每次改前端代码都要重新跑这两个命令。

### 2. 打开 Android Studio

```powershell
npx cap open android
```

会自动打开 Android Studio 并加载 `android/` 工程。

### 3. Gradle 同步

首次打开 Android Studio 会自动执行 Gradle Sync，下载依赖（首次约 5-10 分钟）。等右下角进度条结束。

### 4. 连接安卓设备调试运行（推荐）

- 手机开启**开发者选项 → USB 调试**
- USB 连接电脑
- Android Studio 顶部工具栏选择你的设备 → 点 ▶ Run
- APK 自动安装到手机并启动

### 5. 生成正式签名 APK（用于分发）

**Build → Generate Signed App Bundle / APK → APK**

首次需要创建签名 keystore：
- Key store path：随便选个目录，如 `E:/体彩门店互动平台/release.keystore`
- Password：自己定一个，**记住**
- Alias：`体彩门店互动平台`
- Validity：25 年
- 填写组织信息（国家代码 `CN`，其他随便）

后续选 **release** 构建类型 → Finish。

APK 输出位置：`android/app/release/app-release.apk`

---

## 测试摄像头功能

1. 确保**电脑和手机连同一个 Wi-Fi**
2. **电脑**：跑后端 `npm run start-backend`（或 `node server/...`，端口 3366）
3. **电脑**：可以不跑前端 dev server，APK 里已经打包好了
4. **手机**：点桌面「中国体育彩票」图标启动 APP
5. APP 启动后应该能正常加载页面（数据走 `192.168.15.236:3366` 联网）
6. 进入「体彩小游戏 → 中奖大头贴」→ 系统弹权限申请 → 允许
7. 摄像头预览出现 + 大头贴边框覆盖 → 拍照 → 保存

---

## 常见问题

### Q1：APK 打开白屏

可能原因：
1. **API 不通**：手机访问不到 `192.168.15.236:3366`。在手机浏览器试试 `http://192.168.15.236:3366/api/store/default`，能返回数据吗？
   - 不能 → 检查电脑防火墙是否放行 3366 端口
   - 不能 → 确认 IP 地址（电脑跑 `ipconfig` 重新确认）

2. **WebView 调试**：Android Studio 跑模式下可以用 Chrome 远程调试：
   - 电脑 Chrome 输入 `chrome://inspect`
   - 看到设备里的 WebView → 点 Inspect 看控制台报错

### Q2：摄像头打开后黑屏

- 检查权限：手机系统设置 → APP → 「中国体育彩票」→ 权限 → 摄像头 → 允许
- 检查 `AndroidManifest.xml` 里 `<uses-permission android:name="android.permission.CAMERA" />` 是否存在
- 重新打 APK 试试

### Q3：拍照保存后找不到

当前用 `Filesystem.writeFile({ directory: 'EXTERNAL' })`，文件保存在：
- `Android/data/cn.体彩门店互动平台.app/files/体彩门店互动平台-xxx.jpg`

这是 APP 私有目录，在系统**相册可能看不到**。如需保存到相册，需要安装 `@capacitor-community/media`：

```powershell
npm install @capacitor-community/media
npx cap sync android
```

然后修改 `PhotoStickerCamera.jsx` 用 `Media.savePhoto()` 替代 `Filesystem.writeFile()`。

### Q4：换电脑/换 IP 后怎么办

修改 2 处文件：

1. `src/main.jsx` 里 `API_BASE` 改成新 IP
2. `android/app/src/main/res/xml/network_security_config.xml` 里 `<domain>` 改成新 IP

然后：

```powershell
npm run build
npx cap sync android
```

Android Studio 重新 Run 一下。

### Q5：上线生产

1. 后端部署到云，拿到 HTTPS 域名（如 `https://api.体彩门店互动平台.cn`）
2. `src/main.jsx`：`API_BASE = 'https://api.体彩门店互动平台.cn'`
3. `network_security_config.xml`：删除 cleartext 配置或只保留 HTTPS 域名
4. 重打 APK 即可

---

## 文件清单

| 文件 | 说明 |
|------|------|
| `capacitor.config.json` | Capacitor 主配置 |
| `src/main.jsx` | 全局 fetch 拦截，把 `/api` 重写到本机 IP |
| `android/variables.gradle` | minSdkVersion=26 |
| `android/app/src/main/AndroidManifest.xml` | 摄像头权限 + cleartext |
| `android/app/src/main/res/xml/network_security_config.xml` | 明文 HTTP 白名单 |
| `public/photo-sticker-frame.png` | 大头贴边框 PNG |
| `src/components/PhotoStickerCamera.jsx` | 拍照组件 |

---

## 命令速查表

| 操作 | 命令 |
|------|------|
| 改前端后重新打包 APK | `npm run build && npx cap sync android` |
| 打开 Android Studio | `npx cap open android` |
| 直接命令行打 debug APK | `cd android && ./gradlew assembleDebug` |
| 直接命令行打 release APK | `cd android && ./gradlew assembleRelease` |
| 查看 APK 输出 | `android/app/build/outputs/apk/` |
