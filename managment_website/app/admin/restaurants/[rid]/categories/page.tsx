"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import {
    listCategories,
    Category,
    deleteCategory,
} from "@/lib/data";

export default function CategoriesPage() {
    const { rid } = useParams<{ rid: string }>();
    const [cats, setCats] = useState<Category[]>([]);
    const [loaded, setLoaded] = useState(false);

    async function refresh() {
        setCats(await listCategories(rid));
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
    }, [rid]);

    async function handleDeleteCategory(id: string, catName: string) {
        if (!confirm(`Delete category "${catName}"?`)) return;
        await deleteCategory(rid, id);
        await refresh();
    }

    const actions = (
        <Link href={`/admin/restaurants/${rid}/categories/new`}>
            <button className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    if (!loaded) return <Page title="Loading..."><div>Loading categories...</div></Page>;

    return (
        <Page title="Categories" actions={actions} backPath={`/admin/restaurants/${rid}`}>
            <div className="space-y-2">
                {cats.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 rounded-3xl">
                        No categories found. Click + to create your first one.
                    </Card>
                ) : (
                    cats.map((c) => (
                        <Card key={c.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all rounded-2xl group border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <Link href={`/admin/restaurants/${rid}/categories/${c.id}`} className="flex-1 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 dark:bg-green-900/10 text-green-700 rounded-xl flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-blue-500 hover:underline">
                                            {c.name} {c.nameAr ? `(${c.nameAr})` : ''}
                                        </span>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </Link>
                                <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-1 ml-1">
                                    <Link href={`/admin/restaurants/${rid}/categories/${c.id}/edit`}>
                                        <button className="p-2 text-green-500 hover:bg-green-50 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
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
        </Page>
    );
}
