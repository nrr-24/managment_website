"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useToast } from "@/components/ui/Toast";
import {
    listCategories,
    Category,
    deleteCategory,
} from "@/lib/data";

export default function CategoriesPage() {
    const { rid } = useParams<{ rid: string }>();
    const { showToast, ToastComponent } = useToast();
    const [cats, setCats] = useState<Category[]>([]);
    const [loaded, setLoaded] = useState(false);

    async function refresh() {
        try {
            setCats(await listCategories(rid));
        } catch {
            showToast("Failed to load categories", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
    }, [rid]);

    async function handleDeleteCategory(id: string, catName: string) {
        if (!confirm(`Delete category "${catName}"?`)) return;
        try {
            await deleteCategory(rid, id);
            showToast("Category deleted");
            await refresh();
        } catch {
            showToast("Failed to delete category", "error");
        }
    }

    const actions = (
        <Link href={`/admin/restaurants/${rid}/categories/new`}>
            <button className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    if (!loaded) return <Page title="Loading..." backPath={`/admin/restaurants/${rid}`}><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;

    return (
        <Page title="Categories" actions={actions} backPath={`/admin/restaurants/${rid}`}>
            <div className="space-y-2">
                {cats.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 rounded-3xl">
                        No categories found. Click + to create your first one.
                    </Card>
                ) : (
                    cats.map((c) => (
                        <Card key={c.id} className="p-3 hover:bg-gray-50 transition-all rounded-2xl group border border-gray-100">
                            <div className="flex items-center justify-between">
                                <Link href={`/admin/restaurants/${rid}/categories/${c.id}`} className="flex-1 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-blue-600">
                                        {c.name} {c.nameAr ? `(${c.nameAr})` : ''}
                                    </span>
                                </Link>
                                <div className="flex items-center gap-1">
                                    {/* Edit */}
                                    <Link href={`/admin/restaurants/${rid}/categories/${c.id}/edit`}>
                                        <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </Link>
                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                    {/* Chevron */}
                                    <svg className="w-4 h-4 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
