export default function StatusBadge({ variant = 'default', children, dot = false }) {
    const styles = {
        online: 'bg-emerald-50 text-emerald-700',
        offline: 'bg-gray-50 text-gray-500',
        danger: 'bg-red-50 text-red-700',
        warning: 'bg-amber-50 text-amber-700',
        info: 'bg-blue-50 text-blue-700',
        default: 'bg-slate-50 text-slate-600',
    };
    const dotColors = {
        online: 'bg-emerald-500',
        offline: 'bg-gray-400',
        danger: 'bg-red-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500',
        default: 'bg-slate-400',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${styles[variant] || styles.default}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.default}`} />}
            {children}
        </span>
    );
}
