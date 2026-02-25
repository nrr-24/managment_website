"use client";

import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, hasManagerAccess, logout } = useAuth();
    const r = useRouter();
    const path = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) r.replace("/login");
        else if (!hasManagerAccess) r.replace("/not-authorized");
    }, [user, loading, hasManagerAccess, r]);

    // Close profile menu on Escape
    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") setShowProfileMenu(false);
    }, []);

    useEffect(() => {
        if (showProfileMenu) {
            window.addEventListener("keydown", handleEscape);
            return () => window.removeEventListener("keydown", handleEscape);
        }
    }, [showProfileMenu, handleEscape]);

    if (loading || !user || !hasManagerAccess) {
        return (
            <div className="min-h-screen bg-[#f8f8fa] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" />
            </div>
        );
    }

    const isAdminHome = path === "/admin";

    const navItems = [
        { label: "Restaurants", href: "/admin/restaurants", match: "/restaurants" },
        { label: "Users", href: "/admin/users", match: "/users" },
    ];

    return (
        <div className="min-h-screen bg-[#f8f8fa]">
            {/* Top Nav — hidden on mobile (Page toolbar handles navigation) */}
            {!isAdminHome && (
                <nav className="hidden sm:block sticky top-0 z-50 glass border-b border-gray-200/50">
                    <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link href="/admin" className="font-bold text-[15px] tracking-tight text-green-900 hover:opacity-70 transition-opacity">
                                Menu Admin
                            </Link>
                            <div className="flex items-center gap-0.5 bg-gray-100/80 p-0.5 rounded-full">
                                {navItems.map((item) => {
                                    const active = path.includes(item.match);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all no-min-tap ${
                                                active
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-400 hover:text-gray-600"
                                            }`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="relative flex items-center gap-2.5">
                            <span className="text-[12px] text-gray-400 font-medium hidden sm:block">{user.email}</span>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                aria-label="Profile menu"
                                className="w-9 h-9 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </button>
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div
                                        role="menu"
                                        className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 min-w-[200px] slide-down"
                                    >
                                        <div className="px-3.5 py-2.5 border-b border-gray-100">
                                            <p className="text-[12px] text-gray-400 font-medium truncate">{user.email}</p>
                                        </div>
                                        <button
                                            role="menuitem"
                                            onClick={async () => {
                                                setShowProfileMenu(false);
                                                await logout();
                                                r.push("/login");
                                            }}
                                            className="w-full text-left px-3.5 py-2.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </nav>
            )}

            {children}
        </div>
    );
}
