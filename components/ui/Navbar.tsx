"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "./Button";

export function Navbar() {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const router = useRouter();

    const isAdmin = pathname.startsWith("/admin");

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <Link href="/" className="font-bold text-xl tracking-tighter bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Dining Menu
                </Link>

                <ul className="hidden md:flex items-center gap-6">
                    <li>
                        <Link
                            href="/"
                            className={`text-sm font-bold transition-colors ${pathname === "/" ? "text-blue-600" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
                        >
                            Viewer
                        </Link>
                    </li>
                    {user && (
                        <li>
                            <Link
                                href="/admin"
                                className={`text-sm font-bold transition-colors ${pathname.startsWith("/admin") ? "text-blue-600" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
                            >
                                Admin
                            </Link>
                        </li>
                    )}
                </ul>
            </div>

            <div className="flex items-center gap-4">
                {user ? (
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400 font-medium hidden sm:inline-block">{user.email}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSignOut}
                            className="text-red-500 font-bold px-4"
                        >
                            Sign Out
                        </Button>
                    </div>
                ) : (
                    <Link href="/login">
                        <Button variant="primary" size="sm" className="rounded-full px-6 transition-all active:scale-95 shadow-lg shadow-blue-500/20">
                            Sign In
                        </Button>
                    </Link>
                )}
            </div>
        </nav>
    );
}
