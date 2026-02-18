"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import { deleteRestaurant, listRestaurants, Restaurant } from "@/lib/data";

export default function RestaurantsPage() {
    const { showToast, ToastComponent } = useToast();
    const [list, setList] = useState<Restaurant[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    async function refresh() {
        try {
            setList(await listRestaurants());
        } catch {
            showToast("Failed to load restaurants", "error");
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete restaurant "${name}"?`)) return;
        try {
            await deleteRestaurant(id);
            showToast("Restaurant deleted");
            await refresh();
        } catch {
            showToast("Failed to delete restaurant", "error");
        }
    }

    const filteredList = list.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.nameAr && r.nameAr.includes(searchTerm))
    );

    const actions = (
        <Link href="/admin/restaurants/new">
            <button className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    return (
        <Page title="Restaurants" actions={actions}>
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
                {filteredList.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 rounded-3xl">
                        {list.length === 0
                            ? "No restaurants found. Click + to create your first one."
                            : "No results found."}
                    </Card>
                ) : (
                    filteredList.map((res) => (
                        <Card key={res.id} className="p-3 hover:bg-gray-50 transition-all rounded-2xl border border-gray-100">
                            <div className="flex items-center justify-between gap-3">
                                <Link href={`/admin/restaurants/${res.id}`} className="flex-1 flex items-center gap-3">
                                    <div className="w-11 h-11 bg-green-50 text-green-800 rounded-xl flex items-center justify-center overflow-hidden">
                                        {res.logo ? (
                                            <img src={res.logo} alt="" className="w-full h-full object-cover" />
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
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
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
            {ToastComponent}
        </Page>
    );
}
