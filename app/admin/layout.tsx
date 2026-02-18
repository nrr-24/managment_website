"use client";

import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isManager, logout } = useAuth();
    const r = useRouter();
    const path = usePathname();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        if (loading) return;
        if (!user) r.replace("/login");
        else if (!isManager) r.replace("/not-authorized");
    }, [user, loading, isManager, r]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" />
            </div>
        );
    }
    if (!user || !isManager) return null;

    const isAdminHome = path === "/admin";

    const navItems = [
        { label: "Restaurants", href: "/admin/restaurants", match: "/restaurants" },
        { label: "Users", href: "/admin/users", match: "/users" },
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Top Nav - hide on /admin hub page */}
            {!isAdminHome && (
                <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
                    <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                        <div className="flex items-center gap-8">
                            <Link href="/admin" className="font-bold text-lg tracking-tight text-green-900">
                                Menu Admin
                            </Link>
                            <div className="flex items-center gap-1">
                                {navItems.map((item) => {
                                    const active = path.includes(item.match);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                                                active
                                                    ? "bg-green-900 text-white"
                                                    : "text-gray-400 hover:text-green-900"
                                            }`}
                                        >
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="relative flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-medium hidden sm:block">{user.email}</span>
                            {/* Profile button */}
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            </button>
                            {/* Profile dropdown */}
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 min-w-[180px]">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-xs text-gray-400 font-medium truncate">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                setShowProfileMenu(false);
                                                await logout();
                                                r.push("/login");
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
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
