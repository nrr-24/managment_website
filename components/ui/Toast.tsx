"use client";

import { useCallback, useEffect, useState } from "react";

interface ToastProps {
    message: string;
    type?: "success" | "error";
    onClose: () => void;
}

export function Toast({ message, type = "success", onClose }: ToastProps) {
    const [exiting, setExiting] = useState(false);

    const handleClose = useCallback(() => {
        setExiting(true);
        setTimeout(onClose, 250);
    }, [onClose]);

    useEffect(() => {
        const timer = setTimeout(handleClose, 2500);
        return () => clearTimeout(timer);
    }, [handleClose]);

    return (
        <div className={`fixed bottom-6 left-1/2 z-[100] ${exiting ? 'toast-exit' : 'toast-enter'}`}>
            <div className={`px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 border ${
                type === "success"
                    ? "bg-gray-900/90 backdrop-blur-xl border-white/5 text-white"
                    : "bg-red-500/90 backdrop-blur-xl border-red-400/50 text-white"
            }`}>
                {type === "success" ? (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                ) : (
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                )}
                <span className="font-semibold text-sm whitespace-nowrap">{message}</span>
            </div>
        </div>
    );
}

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
