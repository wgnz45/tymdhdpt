import React from 'react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Capacitor 原生壳（APK）下：把所有相对路径 /api/... 重写到开发机 IP ──
// 浏览器中（Web 端 / Vite dev）保持原样，仍走 Vite proxy。
// 部署到生产环境时，把 API_BASE 改成你的正式后端域名。
(function setupNativeApiBase() {
    if (typeof window === 'undefined') return;
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform?.() === true;
    if (!isNative) return;

    // ⚠️ 联调阶段写死开发机局域网 IP，正式部署时改成 https://你的后端域名
    const API_BASE = 'http://192.168.15.236:3366';

    const origFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
        if (typeof input === 'string' && input.startsWith('/api')) {
            input = API_BASE + input;
        } else if (input && typeof input === 'object' && input.url && input.url.startsWith('/api')) {
            // Request 对象
            input = new Request(API_BASE + input.url, input);
        }
        return origFetch(input, init);
    };

    // axios 用户：默认走 fetch 不需要再处理。如果某些地方用 XMLHttpRequest，再补 patch
    console.log('[Capacitor] API base patched to', API_BASE);
})();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
console.log('Deployment Version: 2026-01-30 17:38 (Force Update - Mobile Editor Fix)');
