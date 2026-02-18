"use client";

import { useEffect, useState } from "react";

interface ToastProps {
    message: string;
    type?: "success" | "error";
    onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-3 border ${type === "success"
                    ? "bg-black/80 border-white/10 text-white"
                    : "bg-red-500/90 border-red-400 text-white"
                }`}>
                {type === "success" ? (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
                <span className="font-bold text-sm tracking-tight">{message}</span>
            </div>
        </div>
    );
}

// Hook for easier usage
export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
    };

    const hideToast = () => setToast(null);

    const ToastComponent = toast ? (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
    ) : null;

    return { showToast, ToastComponent };
}
