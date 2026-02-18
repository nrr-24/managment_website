"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (user) {
            router.replace("/admin");
        } else {
            router.replace("/login");
        }
    }, [user, loading, router]);

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin" />
        </div>
    );
}
