"use client";

import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isManager, logout } = useAuth();
    const r = useRouter();
    const path = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!user) r.replace("/login");
        else if (!isManager) r.replace("/not-authorized");
    }, [user, loading, isManager, r]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
            </div>
        );
    }
    if (!user || !isManager) return null;

    const navItems = [
        { label: "Restaurants", href: "/admin/restaurants", match: "/restaurants" },
        { label: "Users", href: "/admin/users", match: "/users" },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
            {/* Top Nav */}
            <nav className="sticky top-0 z-50 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/admin/restaurants" className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
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
                                                ? "bg-gray-900 dark:bg-white text-white dark:text-black"
                                                : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400 font-medium hidden sm:block">{user.email}</span>
                        <button
                            onClick={async () => {
                                await logout();
                                r.push("/login");
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-600 transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {children}
        </div>
    );
}
