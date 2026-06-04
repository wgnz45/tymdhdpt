export default function PageContainer({ children, className = '' }) {
    return (
        <div className={`max-w-7xl mx-auto px-8 py-6 ${className}`}>
            {children}
        </div>
    );
}
