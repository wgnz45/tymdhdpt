export default function PageHeader({ icon: Icon, title, description, children, className = '' }) {
    return (
        <div className={`flex justify-between items-start mb-8 ${className}`}>
            <div className="flex items-start gap-4">
                {Icon && (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1e3a5f] to-[#2a5a8f] flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Icon size={20} className="text-white" />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
                    {description && <p className="text-sm text-slate-400 mt-1">{description}</p>}
                </div>
            </div>
            {children && <div className="flex items-center gap-2 flex-shrink-0">{children}</div>}
        </div>
    );
}
