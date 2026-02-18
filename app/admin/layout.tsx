"use client";

import { useAuth } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isManager, logout } = useAuth();
    const r = useRouter();
    const path = usePathname();

    useEffect(() => {
        if (loading) return;
        if (!user) r.replace("/login");
        else if (!isManager) r.replace("/not-authorized");
    }, [user, loading, isManager, r]);

    if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
    if (!user || !isManager) return null;

    return (
        <div>
            <div
                style={{
                    borderBottom: "1px solid #e5e7eb",
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <b>Menu Admin</b>
                    <Link href="/admin/restaurants" style={{ textDecoration: path.includes("/restaurants") ? "underline" : "" }}>
                        Restaurants
                    </Link>
                </div>
                <Button
                    variant="ghost"
                    onClick={async () => {
                        await logout();
                        r.push("/login");
                    }}
                >
                    Logout
                </Button>
            </div>

            {children}
        </div>
    );
}
