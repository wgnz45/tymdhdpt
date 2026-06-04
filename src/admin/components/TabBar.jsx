export default function TabBar({ tabs, activeKey, onChange }) {
    return (
        <div className="flex bg-slate-100/80 rounded-xl p-1 gap-0.5">
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                        activeKey === tab.key
                            ? 'bg-white text-[#1e3a5f] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                    }`}
                >
                    <span className="flex items-center gap-1.5">
                        {tab.icon && <tab.icon size={15} />}
                        {tab.label}
                    </span>
                </button>
            ))}
        </div>
    );
}
