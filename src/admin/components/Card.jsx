export default function Card({ children, className = '', noPadding = false }) {
    return (
        <div className={`bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] ${noPadding ? '' : 'p-6'} ${className}`}>
            {children}
        </div>
    );
}
