"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { StorageImage } from "@/components/ui/StorageImage";
import { useGlobalUI } from "@/components/ui/Toast";
import { RestaurantListSkeleton } from "@/components/ui/Skeleton";
import { deleteRestaurant, listRestaurants, Restaurant } from "@/lib/data";

export default function RestaurantsPage() {
    const { toast, confirm } = useGlobalUI();
    const [list, setList] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    async function refresh() {
        try {
            setList(await listRestaurants());
        } catch {
            toast("Failed to load restaurants", "error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleDelete(id: string, name: string) {
        const ok = await confirm({ title: "Delete Restaurant", message: `Delete "${name}" and all its data? This cannot be undone.`, destructive: true });
        if (!ok) return;
        setDeletingId(id);
        try {
            await deleteRestaurant(id);
            toast("Restaurant deleted");
            await refresh();
        } catch (err) {
            console.error("Delete restaurant failed:", err);
            toast("Failed to delete restaurant", "error");
        } finally {
            setDeletingId(null);
        }
    }

    const filteredList = list.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.nameAr && r.nameAr.includes(searchTerm))
    );

    const actions = (
        <Link href="/admin/restaurants/new">
            <button aria-label="Add new restaurant" className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    return (
        <Page title={`Restaurants (${filteredList.length})`} actions={actions}>
            {/* Search */}
            <div className="relative">
                <input
                    placeholder="Search restaurants..."
                    className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-gray-100 outline-none text-sm font-medium focus:border-green-800 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            <div className="space-y-2">
                {loading ? (
                    <RestaurantListSkeleton />
                ) : filteredList.length === 0 ? (
                    <Card className="p-12 text-center rounded-3xl">
                        {list.length === 0 ? (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                                    <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                    </svg>
                                </div>
                                <p className="font-semibold text-gray-900 mb-1">No restaurants yet</p>
                                <p className="text-sm text-gray-400 mb-4">Get started by creating your first restaurant</p>
                                <Link href="/admin/restaurants/new">
                                    <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                                        + Create Restaurant
                                    </button>
                                </Link>
                            </div>
                        ) : (
                            <p className="text-gray-500">No results found.</p>
                        )}
                    </Card>
                ) : (
                    filteredList.map((res) => (
                        <Card key={res.id} className="p-3 hover:bg-gray-50 transition-all rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between gap-3">
                                <Link href={`/admin/restaurants/${res.id}`} className="flex-1 flex items-center gap-3">
                                    <div className="w-11 h-11 bg-green-50 text-green-800 rounded-xl flex items-center justify-center overflow-hidden">
                                        {res.imagePath ? (
                                            <StorageImage path={res.imagePath} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-blue-600">{res.name}</h3>
                                        {res.nameAr && <p className="text-xs text-gray-400 mt-0.5">{res.nameAr}</p>}
                                    </div>
                                </Link>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleDelete(res.id, res.name)}
                                        disabled={deletingId === res.id}
                                        aria-label={`Delete ${res.name}`}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {deletingId === res.id ? (
                                            <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </Page>
    );
}
