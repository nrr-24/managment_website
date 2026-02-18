"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import {
    Dish,
    deleteDish,
    deleteImageByPath,
    getCategory,
    listDishes,
} from "@/lib/data";

export default function CategoryManagePage() {
    const { rid, cid } = useParams<{ rid: string; cid: string }>();

    const [catName, setCatName] = useState("");
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loaded, setLoaded] = useState(false);

    async function refresh() {
        const cat = await getCategory(rid, cid);
        if (cat) {
            setCatName(cat.name || "");
        }
        setDishes(await listDishes(rid, cid));
        setLoaded(true);
    }

    const filteredDishes = dishes.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.nameAr && d.nameAr.includes(searchTerm)) ||
        (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        refresh();
    }, [rid, cid]);

    async function handleDeleteDish(dish: Dish) {
        if (!confirm(`Delete dish "${dish.name}"?`)) return;
        if (dish.imagePaths) {
            for (const path of dish.imagePaths) {
                await deleteImageByPath(path);
            }
        }
        await deleteDish(rid, cid, dish.id);
        await refresh();
    }

    const actions = (
        <div className="flex items-center gap-2">
            <Link href={`/admin/restaurants/${rid}/categories/${cid}/edit`}>
                <button className="w-10 h-10 flex items-center justify-center bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-full hover:bg-blue-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </Link>
            <Link href={`/admin/restaurants/${rid}/categories/${cid}/new`}>
                <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
            </Link>
        </div>
    );

    if (!loaded) return <Page title="Loading..."><div>Loading dishes...</div></Page>;

    return (
        <Page title={catName || cid} actions={actions} backPath={`/admin/restaurants/${rid}/categories`}>
            <div className="space-y-4">
                <div className="relative px-2">
                    <input
                        placeholder="Search dishes..."
                        className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="space-y-2">
                    {filteredDishes.length === 0 ? (
                        <Card className="p-12 text-center text-gray-500 rounded-3xl">
                            {searchTerm ? "No dishes match your search." : "No dishes found in this category. Click + to add your first dish."}
                        </Card>
                    ) : (
                        filteredDishes.map((d) => (
                            <Card key={d.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all rounded-2xl group border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/10 text-green-700 rounded-xl flex items-center justify-center">
                                                {d.imageUrls && d.imageUrls[0] ? (
                                                    <img src={d.imageUrls[0]} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-blue-500">{d.name}</h4>
                                                {d.price != null && (
                                                    <p className="text-xs text-gray-400 font-medium">KWD {d.price.toFixed(3)}</p>
                                                )}
                                            </div>
                                        </div>
                                        <svg className="w-4 h-4 text-gray-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-1 ml-1">
                                        <Link href={`/admin/restaurants/${rid}/categories/${cid}/${d.id}/edit`}>
                                            <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteDish(d)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </Page>
    );
}
