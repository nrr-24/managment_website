"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ─── Toast Types ───
type ToastType = "success" | "error";

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
    exiting: boolean;
}

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

interface GlobalUIContextType {
    toast: (message: string, type?: ToastType) => void;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const GlobalUIContext = createContext<GlobalUIContextType | null>(null);

let nextId = 0;

// ─── Standalone toast function (works outside React) ───
let _globalToast: ((message: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
    _globalToast?.(message, type);
}

toast.error = (message: string) => toast(message, "error");
toast.success = (message: string) => toast(message, "success");

// ─── Provider ───
export function GlobalUIProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [confirmState, setConfirmState] = useState<{
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    } | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const addToast = useCallback((message: string, type: ToastType = "success") => {
        const id = ++nextId;
        setToasts((prev) => [...prev.slice(-2), { id, message, type, exiting: false }]);
    }, []);

    // Register for standalone usage
    useEffect(() => {
        _globalToast = addToast;
        return () => { _globalToast = null; };
    }, [addToast]);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 250);
    }, []);

    const confirmFn = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ options, resolve });
        });
    }, []);

    const handleConfirm = useCallback((value: boolean) => {
        confirmState?.resolve(value);
        setConfirmState(null);
    }, [confirmState]);

    // Escape key to dismiss confirm modal
    useEffect(() => {
        if (!confirmState) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleConfirm(false);
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [confirmState, handleConfirm]);

    const ctx: GlobalUIContextType = { toast: addToast, confirm: confirmFn };

    return (
        <GlobalUIContext.Provider value={ctx}>
            {children}
            {mounted && createPortal(
                <>
                    {/* Toast Stack */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col-reverse items-center gap-2 pointer-events-none" aria-live="polite">
                        {toasts.map((t) => (
                            <ToastBubble key={t.id} item={t} onDismiss={dismissToast} />
                        ))}
                    </div>

                    {/* Confirm Modal */}
                    {confirmState && (
                        <ConfirmModal
                            options={confirmState.options}
                            onConfirm={() => handleConfirm(true)}
                            onCancel={() => handleConfirm(false)}
                        />
                    )}
                </>,
                document.body
            )}
        </GlobalUIContext.Provider>
    );
}

// ─── Toast Bubble ───
function ToastBubble({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(item.id), item.type === "error" ? 4000 : 2500);
        return () => clearTimeout(timer);
    }, [item.id, item.type, onDismiss]);

    return (
        <div
            role="alert"
            onClick={() => onDismiss(item.id)}
            className={`pointer-events-auto cursor-pointer max-w-[90vw] ${item.exiting ? "toast-exit" : "toast-enter"}`}
        >
            <div className={`px-5 py-3 rounded-full shadow-2xl flex items-center gap-2.5 border ${
                item.type === "success"
                    ? "bg-gray-900/90 backdrop-blur-xl border-white/5 text-white"
                    : "bg-red-500/90 backdrop-blur-xl border-red-400/50 text-white"
            }`}>
                {item.type === "success" ? (
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
                <span className="font-semibold text-sm">{item.message}</span>
            </div>
        </div>
    );
}

// ─── Confirm Modal ───
function ConfirmModal({
    options,
    onConfirm,
    onCancel,
}: {
    options: ConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmRef.current?.focus();
    }, []);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm fade-in"
                style={{ animationDuration: "0.2s" }}
                onClick={onCancel}
            />

            {/* Dialog */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
                className="relative bg-white rounded-3xl shadow-2xl border border-gray-200/60 w-full max-w-sm overflow-hidden scale-in"
            >
                <div className="p-6 pb-2 text-center">
                    {/* Icon */}
                    <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                        options.destructive ? "bg-red-50" : "bg-blue-50"
                    }`}>
                        {options.destructive ? (
                            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>

                    <h3 id="confirm-title" className="text-lg font-bold text-gray-900 mb-1.5">{options.title}</h3>
                    <p id="confirm-message" className="text-sm text-gray-500 leading-relaxed">{options.message}</p>
                </div>

                <div className="p-4 pt-5 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-3 rounded-2xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
                    >
                        {options.cancelLabel || "Cancel"}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        className={`flex-1 px-4 py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition-all ${
                            options.destructive
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-green-800 text-white hover:bg-green-900"
                        }`}
                    >
                        {options.confirmLabel || (options.destructive ? "Delete" : "Confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Hook (for components that need the context) ───
export function useGlobalUI() {
    const ctx = useContext(GlobalUIContext);
    if (!ctx) throw new Error("useGlobalUI must be used within GlobalUIProvider");
    return ctx;
}

// ─── Backward compatibility: useToast shim ───
export function useToast() {
    const ctx = useContext(GlobalUIContext);
    const showToast = (message: string, type: "success" | "error" = "success") => {
        if (ctx) ctx.toast(message, type);
        else toast(message, type);
    };
    return { showToast, ToastComponent: null };
}
