# 中奖大头贴拍照功能 — APK 构建指南

## 概述

本功能在中奖弹窗中提供「拍照纪念」入口，调用安卓摄像头实时预览，将体彩大头贴图框（`public/photo-sticker-frame.png`）覆盖在拍摄画面上方，拍照后用 Canvas 合成「相机画面 + 边框」输出 JPEG 并保存到相册。

## 当前状态

### 已完成（Web 阶段）
- ✅ 大头贴 PNG 已放到 `public/photo-sticker-frame.png`（中央透明）
- ✅ `src/components/PhotoStickerCamera.jsx` — 拍摄/预览/合成/保存全流程
- ✅ `src/pages/ScratchCard.jsx` — 中奖弹窗已加「拍照纪念」按钮

### 待完成（APK 阶段）
- ⬜ 集成 Capacitor，生成 `android/` 目录
- ⬜ 配置摄像头权限
- ⬜ 安装 `@capacitor/filesystem` 实现保存到相册
- ⬜ 用 Android Studio 构建 APK

---

## 浏览器测试

```bash
npm run dev
```

访问：`http://localhost:5173/#/s/default/scratch`

操作：选择面值 → 点「开始抽选」→ 中奖后点「拍照纪念」

> 浏览器需要 HTTPS 或 `localhost` 才允许 `getUserMedia`。Chrome 桌面端会用电脑摄像头。
> 手机浏览器测试需要使用 HTTPS（`vite --host` + 反向代理或 Cloudflare Tunnel）。

---

## APK 构建步骤（Capacitor 方案）

### 1. 安装 Capacitor 依赖

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/filesystem
```

### 2. 初始化 Capacitor 配置

```bash
npx cap init "体彩门店互动平台" "cn.体彩门店互动平台.app" --web-dir=dist
```

会生成 `capacitor.config.json`，建议改为：

```json
{
  "appId": "cn.体彩门店互动平台.app",
  "appName": "中国体育彩票",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": false
  }
}
```

### 3. 构建前端 + 添加 Android 平台

```bash
npm run build
npx cap add android
npx cap sync android
```

完成后会出现 `android/` 目录。

### 4. 配置 Android 权限

编辑 `android/app/src/main/AndroidManifest.xml`，在 `<manifest>` 内加入：

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### 5. 启用 WebView 摄像头授权

编辑 `android/app/src/main/java/.../MainActivity.java`（Capacitor 默认已处理 `getUserMedia` 的权限请求，无需修改）。

如果遇到摄像头黑屏，确认：
- 系统设置中允许 APP 的摄像头权限
- `BridgeWebViewClient` 中 `onPermissionRequest` 已 grant CAMERA 权限（Capacitor 7+ 默认开启）

### 6. 在 Android Studio 中打开

```bash
npx cap open android
```

会启动 Android Studio。等 Gradle 同步完成后：
- **Build → Generate Signed Bundle / APK** → 选 APK
- 签名（首次需创建 keystore）→ Build Type 选 `release` → 完成
- APK 输出位置：`android/app/release/app-release.apk`

### 7. 调试 APK（可选）

```bash
# 打开浏览器调试连接的 Android 设备
chrome://inspect

# 或用 ADB 看日志
adb logcat | findstr "Capacitor\|chromium"
```

---

## 重要：保存到相册的实现

`PhotoStickerCamera.jsx` 中已写好 Capacitor 检测分支：

```js
if (window.Capacitor?.isNativePlatform?.()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ ... });
}
```

> 上面这段代码在 Web 环境会进入 `catch` 分支自动 fallback 到浏览器下载。  
> APK 中会调用原生文件系统保存到 `Directory.External`（即手机的 `Android/data/cn.体彩门店互动平台.app/files/`）。

如果想保存到**用户可见的相册**（DCIM 目录），需要额外安装 `@capacitor-community/media` 或自己写小插件，调用 `MediaStore` API。这一步建议 APK 跑通后再做。

---

## 常见问题

### Q1：拍照后图片镜像反了
**A**：前置摄像头预览本身是镜像的（自拍习惯），但合成时已经 `ctx.scale(-1, 1)` 还原成正向，所以输出图是正的。如发现仍反，检查 `facingMode` 状态。

### Q2：边框 PNG 在拍摄画面上比例不对
**A**：边框 PNG 是 4:3（1024×768），但摄像头画面可能是 16:9。组件用 `object-fit: contain` 让边框完整显示，摄像头画面用 `object-fit: cover` 填满。合成时以**边框 PNG 尺寸**为输出尺寸，相机画面按 cover 裁剪。

### Q3：APK 中摄像头黑屏
**A**：检查 `AndroidManifest.xml` 的 `CAMERA` 权限。Capacitor 默认允许 WebView 调用 `getUserMedia`，但需要原生权限支撑。在 APP 系统设置中看是否要手动授予摄像头权限。

### Q4：能否拍视频？
**A**：当前组件只做静态拍照。要加视频需用 `MediaRecorder` API + 帧合成（成本翻倍）。建议作为下一阶段需求。

---

## 文件清单

| 文件 | 作用 |
|------|------|
| `public/photo-sticker-frame.png` | 大头贴边框（中央透明）|
| `src/components/PhotoStickerCamera.jsx` | 全屏拍照组件 |
| `src/pages/ScratchCard.jsx` | 接入「拍照纪念」按钮 |
| `docs/PHOTO_STICKER_APK.md` | 本文档 |
| `capacitor.config.json` | （待生成）Capacitor 配置 |
| `android/` | （待生成）Android 原生壳 |
