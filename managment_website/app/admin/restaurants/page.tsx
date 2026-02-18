"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { createRestaurant, deleteRestaurant, listRestaurants, Restaurant } from "@/lib/data";

export default function RestaurantsPage() {
    const [list, setList] = useState<Restaurant[]>([]);
    const [busy, setBusy] = useState(false);

    async function refresh() {
        setList(await listRestaurants());
    }

    useEffect(() => {
        refresh();
    }, []);

    async function handleCreate() {
        const name = prompt("Enter restaurant name:");
        if (!name?.trim()) return;
        setBusy(true);
        try {
            await createRestaurant({ name: name.trim() });
            await refresh();
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Delete restaurant "${name}"?`)) return;
        await deleteRestaurant(id);
        await refresh();
    }

    const actions = (
        <Link href="/admin/restaurants/new">
            <button className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    return (
        <Page title="Restaurants" actions={actions}>
            <div className="space-y-3">
                {list.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 rounded-3xl">
                        No restaurants found. Click + to create your first one.
                    </Card>
                ) : (
                    list.map((res) => (
                        <Card key={res.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all group rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between gap-4">
                                <Link href={`/admin/restaurants/${res.id}`} className="flex-1 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-700 rounded-xl flex items-center justify-center">
                                        {res.logo ? (
                                            <img src={res.logo} alt="" className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-blue-500 hover:underline">{res.name}</h3>
                                        {res.nameAr && <p className="text-xs text-gray-400 mt-0.5">{res.nameAr}</p>}
                                    </div>
                                </Link>
                                <button
                                    onClick={() => handleDelete(res.id, res.name)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </Page>
    );
}
