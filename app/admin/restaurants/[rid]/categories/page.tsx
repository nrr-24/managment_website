"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { CategoryListSkeleton } from "@/components/ui/Skeleton";
import {
    listCategories,
    Category,
    deleteCategory,
    getRestaurant,
} from "@/lib/data";

export default function CategoriesPage() {
    const { rid } = useParams<{ rid: string }>();
    const { toast, confirm } = useGlobalUI();
    const [cats, setCats] = useState<Category[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");

    async function refresh() {
        try {
            setCats(await listCategories(rid));
        } catch {
            toast("Failed to load categories", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
        refresh();
    }, [rid]);

    async function handleDeleteCategory(id: string, catName: string) {
        const ok = await confirm({ title: "Delete Category", message: `Delete category "${catName}" and all its dishes?`, destructive: true });
        if (!ok) return;
        try {
            await deleteCategory(rid, id);
            toast("Category deleted");
            await refresh();
        } catch {
            toast("Failed to delete category", "error");
        }
    }

    const actions = (
        <Link href={`/admin/restaurants/${rid}/categories/new`}>
            <button aria-label="Add new category" className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
            </button>
        </Link>
    );

    const breadcrumbs = [
        { label: "Restaurants", href: "/admin/restaurants" },
        { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
        { label: "Categories" },
    ];

    if (!loaded) return (
        <Page title="Loading..." backPath={`/admin/restaurants/${rid}`} breadcrumbs={breadcrumbs}>
            <CategoryListSkeleton />
        </Page>
    );

    return (
        <Page title={`Categories (${cats.length})`} actions={actions} backPath={`/admin/restaurants/${rid}`} breadcrumbs={breadcrumbs}>
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
                                        <button aria-label={`Edit ${c.name}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                    </Link>
                                    {/* Delete */}
                                    <button
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
                                        aria-label={`Delete ${c.name}`}
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
        </Page>
    );
}
