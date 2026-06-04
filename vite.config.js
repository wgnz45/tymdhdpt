import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // 自签 HTTPS：让安卓 Chrome 通过局域网 IP 访问时也算安全上下文，
    // 才能调用 navigator.mediaDevices.getUserMedia（摄像头）。
    // 仅 dev 启用即可（build 时不会注入证书）。
    basicSsl(),
    legacy({
      targets: [
        'Chrome >= 70',
        'Android >= 8',
        'iOS >= 13',
        'Safari >= 13',
        'Edge >= 79',
        'Firefox >= 68'
      ],
      renderLegacyChunks: true,
      modernPolyfills: false
    })
  ],
  build: {
    // Keep CSS output conservative for older Android browser kernels.
    cssTarget: 'chrome61'
  },
  server: {
    host: '0.0.0.0',
    https: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3366',
        changeOrigin: true
      },
      '/photo-frames': {
        target: 'http://127.0.0.1:3366',
        changeOrigin: true
      },
      '/game-logos': {
        target: 'http://127.0.0.1:3366',
        changeOrigin: true
      }
    }
  }
})
