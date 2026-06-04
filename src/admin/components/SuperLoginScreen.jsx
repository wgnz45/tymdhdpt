import { useState } from 'react';
import { ArrowRight, Shield } from 'lucide-react';

export default function SuperLoginScreen({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;
        setLoading(true);
        setError('');
        try {
            await onLogin(username.trim(), password.trim());
        } catch (err) {
            setError(err?.message || '登录失败，请检查用户名和密码');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] via-[#3b82f6] to-[#06b6d4]" />

                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2a5a8f] mx-auto mb-5 shadow-md">
                        <Shield size={24} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-slate-900 text-center mb-1">管理后台登录</h2>
                    <p className="text-sm text-slate-400 text-center mb-6">体彩信息发布终端管理系统</p>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="用户名"
                            autoFocus
                            autoComplete="username"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="密码"
                            autoComplete="current-password"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                        />
                        {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading || !username.trim() || !password.trim()}
                            className="w-full px-4 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl text-sm font-semibold hover:from-[#163050] hover:to-[#1e3a5f] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-900/20 active:scale-[0.98]"
                        >
                            {loading ? '登录中...' : '登录'}
                            <ArrowRight size={15} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
