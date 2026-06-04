import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ConfirmDialog({ open, title = '确认操作', message, confirmLabel = '确认', danger = false, onConfirm, onCancel }) {
    const dialogRef = useRef(null);

    useEffect(() => {
        if (open) dialogRef.current?.focus();
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50' : 'bg-blue-50'}`}>
                        <AlertCircle size={20} className={danger ? 'text-red-500' : 'text-blue-500'} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{message}</p>
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <button
                        ref={dialogRef}
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
