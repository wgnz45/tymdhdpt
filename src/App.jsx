import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import StoreClientLayout from './components/StoreClientLayout';
import PortalStyleSports from './pages/PortalStyleSports';

// 动态导入失败时自动刷新页面（解决部署后旧缓存问题）
function lazyRetry(importFn) {
  return React.lazy(() =>
    importFn().catch(() => {
      // chunk 加载失败，可能是部署后缓存了旧 index.html
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
        return new Promise(() => {}); // 不 resolve，等待页面刷新
      }
      sessionStorage.removeItem('chunk_reload');
      return importFn(); // 刷新后仍失败，正常抛错
    })
  );
}

// ErrorBoundary: 兜底捕获 chunk 加载失败
class ChunkErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) {
    if (error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch')) {
      const hasReloaded = sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_reload', '1');
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
          <div style={{ color: '#666', fontSize: 14 }}>页面加载出错</div>
          <button onClick={() => { sessionStorage.removeItem('chunk_reload'); window.location.reload(); }}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>刷新重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// 懒加载：管理端
const AdminLayout = lazyRetry(() => import('./admin/AdminLayout'));
const Dashboard = lazyRetry(() => import('./admin/Dashboard'));
const StoreConfig = lazyRetry(() => import('./admin/StoreConfig'));
const StoreManager = lazyRetry(() => import('./admin/pages/StoreManager'));
const Announcements = lazyRetry(() => import('./admin/pages/Announcements'));
const RemoteControl = lazyRetry(() => import('./admin/pages/RemoteControl'));
const GlobalConfig = lazyRetry(() => import('./admin/pages/GlobalConfig'));
const Kanban = lazyRetry(() => import('./admin/pages/Kanban'));
const CrawlerMonitor = lazyRetry(() => import('./admin/CrawlerMonitor'));
const FortuneManager = lazyRetry(() => import('./admin/FortuneManager'));
const LayoutManager = lazyRetry(() => import('./admin/LayoutManager'));
const PhotoFramesManager = lazyRetry(() => import('./admin/PhotoFramesManager'));
const WinnerConfig = lazyRetry(() => import('./admin/WinnerConfig'));
const RBACManager = lazyRetry(() => import('./admin/pages/RBACManager'));
const GameConfig = lazyRetry(() => import('./admin/pages/GameConfig'));
const GameHubConfig = lazyRetry(() => import('./admin/pages/GameHubConfig'));
const GameLogosManager = lazyRetry(() => import('./admin/GameLogosManager'));

// 懒加载：门店页面变体
const Home = lazyRetry(() => import('./pages/Home'));
const Calculator = lazyRetry(() => import('./pages/Calculator'));
const ScratchCard = lazyRetry(() => import('./pages/ScratchCard'));
const PortalStyleVIP = lazyRetry(() => import('./pages/PortalStyleVIP'));
const PortalStylePop = lazyRetry(() => import('./pages/PortalStylePop'));
const PortalStyleYouth = lazyRetry(() => import('./pages/PortalStyleYouth'));
const PortalStyleSportsNeo = lazyRetry(() => import('./pages/PortalStyleSportsNeo'));
const PortalStyleSportsSticker = lazyRetry(() => import('./pages/PortalStyleSportsSticker'));
const PortalStyleSportsGuochao = lazyRetry(() => import('./pages/PortalStyleSportsGuochao'));
const PortalStyleSportsArcade = lazyRetry(() => import('./pages/PortalStyleSportsArcade'));
const PortalStyleSportsScoreboard = lazyRetry(() => import('./pages/PortalStyleSportsScoreboard'));
const PenaltyGameRoute = lazyRetry(() => import('./games/penalty/PenaltyGameRoute'));
const FlappyBirdRoute = lazyRetry(() => import('./games/flappy/FlappyBirdRoute'));
const LazyFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
    <div style={{ color: '#999', fontSize: 14 }}>加载中...</div>
  </div>
);

function AdminRedirect() {
  const { storeId } = useParams();
  return <Navigate to={`/s/${storeId}/admin/config`} replace />;
}

export default function App() {
  return (
    <ChunkErrorBoundary>
    <HashRouter>
      <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Public Portal */}
        <Route path="/" element={<Navigate to="/s/default" replace />} />
        <Route path="/admin/:storeId/*" element={<AdminRedirect />} />

        {/* Unified Main Site Admin (The original /admin) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="config" element={<StoreConfig />} />
          <Route path="stores" element={<StoreManager />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="remote" element={<RemoteControl />} />
          <Route path="kanban" element={<Kanban />} />
          <Route path="settings" element={<GlobalConfig />} />
          <Route path="winner-config" element={<WinnerConfig />} />
          <Route path="sub-sites" element={<StoreManager />} />
          <Route path="crawler" element={<CrawlerMonitor />} />
          <Route path="layout" element={<LayoutManager />} />
          <Route path="photo-frames" element={<PhotoFramesManager />} />
          <Route path="game-logos" element={<GameLogosManager />} />
          <Route path="fortune" element={<FortuneManager />} />
          <Route path="rbac" element={<RBACManager />} />
          <Route path="game-config" element={<GameConfig />} />
          <Route path="game-hub-config" element={<GameHubConfig />} />
        </Route>

        {/* Multi-Tenant Sub-Site Routes */}
        <Route path="/s/:storeId" element={<StoreClientLayout />}>
          <Route index element={<PortalStyleSports />} />
          <Route path="style-vip" element={<PortalStyleVIP />} />
          <Route path="style-pop" element={<PortalStylePop />} />
          <Route path="style-sports" element={<PortalStyleSports />} />
          <Route path="style-youth" element={<PortalStyleYouth />} />
          <Route path="style-sports-neo" element={<PortalStyleSportsNeo />} />
          <Route path="style-sports-sticker" element={<PortalStyleSportsSticker />} />
          <Route path="style-sports-guochao" element={<PortalStyleSportsGuochao />} />
          <Route path="style-sports-arcade" element={<PortalStyleSportsArcade />} />
          <Route path="style-sports-scoreboard" element={<PortalStyleSportsScoreboard />} />
          <Route path="lotto" element={<Home />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="scratch" element={<ScratchCard />} />
          <Route path="games/penalty" element={<PenaltyGameRoute />} />
          <Route path="games/flappy" element={<FlappyBirdRoute />} />

        </Route>

        {/* Fallback */}
        <Route path="*" element={<div className="p-10 text-center text-gray-400">404 - 页面不存在</div>} />
      </Routes>
      </Suspense>
    </HashRouter>
    </ChunkErrorBoundary>
  );
}
