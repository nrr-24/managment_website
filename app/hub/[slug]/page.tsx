"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MenuHub, Restaurant, getMenuHub, getRestaurant } from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";

type Loaded = { hub: MenuHub; restaurants: Restaurant[] };

export default function HubPage() {
    const { slug } = useParams() as { slug: string };
    const [data, setData] = useState<Loaded | null>(null);
    const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
    const [language, setLanguage] = useState<"en" | "ar">("en");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const hub = await getMenuHub(slug);
                if (!hub) {
                    if (!cancelled) setState("missing");
                    return;
                }
                // Keep the hub's own order; skip restaurants that were deleted since.
                const found = await Promise.all(hub.restaurantIds.map((id) => getRestaurant(id).catch(() => null)));
                const restaurants = found.filter((r): r is Restaurant => !!r);
                if (!cancelled) {
                    setData({ hub, restaurants });
                    setState("ready");
                }
            } catch {
                if (!cancelled) setState("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    const isAr = language === "ar";
    const hasAr = !!data && (!!data.hub.titleAr || data.restaurants.some((r) => !!r.nameAr));

    if (state === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (state !== "ready" || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 text-white">
                <p className="text-xl font-semibold mb-1">{state === "missing" ? "Page not found" : "Couldn’t load the menus"}</p>
                <p className="text-white/50 text-sm">
                    {state === "missing" ? "This link may be out of date." : "Check your connection and try again."}
                </p>
            </div>
        );
    }

    const { hub, restaurants } = data;

    return (
        <main dir={isAr ? "rtl" : "ltr"} className="min-h-screen text-white px-5 py-10 sm:py-16">
            <div className="mx-auto w-full max-w-md">
                {hasAr && (
                    <div className="flex justify-end mb-6">
                        <button
                            onClick={() => setLanguage(isAr ? "en" : "ar")}
                            className="h-10 px-4 rounded-full bg-[#EAE3D2] text-[#1f1f1f] text-sm font-bold shadow-md active:scale-95 transition"
                        >
                            {isAr ? "EN" : "AR"}
                        </button>
                    </div>
                )}

                <h1 className="text-center text-3xl sm:text-4xl font-bold tracking-tight mb-2">
                    {isAr && hub.titleAr ? hub.titleAr : hub.title}
                </h1>
                <p className="text-center text-white/50 mb-10">{isAr ? "اختر مطعماً لعرض القائمة" : "Choose a restaurant to view its menu"}</p>

                {restaurants.length === 0 ? (
                    <p className="text-center text-white/40">No menus here yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {restaurants.map((r) => {
                            const showLogo = r.showLogo !== false && !!r.imagePath;
                            const name = isAr && r.nameAr ? r.nameAr : r.name;
                            return (
                                <li key={r.id}>
                                    <Link
                                        href={`/menu/${r.id}`}
                                        className="flex items-center gap-4 rounded-3xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition px-5 py-4 min-h-[72px]"
                                    >
                                        {showLogo && (
                                            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white/5 shrink-0">
                                                <StorageImage path={r.imagePath} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <span className="flex-1 min-w-0 text-xl font-bold truncate">{name}</span>
                                        <svg
                                            className={`w-5 h-5 text-white/40 shrink-0 ${isAr ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </main>
    );
}
