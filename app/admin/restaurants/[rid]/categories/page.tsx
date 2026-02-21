"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { CategoryListSkeleton } from "@/components/ui/Skeleton";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    listCategories,
    Category,
    deleteCategory,
    getRestaurant,
    reorderCategories,
} from "@/lib/data";

function SortableCategoryItem({
    category,
    rid,
    onDelete,
}: {
    category: Category;
    rid: string;
    onDelete: (id: string, name: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`p-3 hover:bg-gray-50 transition-all rounded-2xl group border border-gray-100 ${isDragging ? "shadow-xl bg-white ring-2 ring-green-800/20" : ""}`}>
                <div className="flex items-center justify-between">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-2 -ml-1 mr-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
                        aria-label="Drag to reorder"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        </svg>
                    </button>

                    <Link href={`/admin/restaurants/${rid}/categories/${category.id}`} className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                            </svg>
                        </div>
                        <span className="font-bold text-blue-600">
                            {category.name} {category.nameAr ? `(${category.nameAr})` : ''}
                        </span>
                    </Link>
                    <div className="flex items-center gap-1">
                        {/* Edit */}
                        <Link href={`/admin/restaurants/${rid}/categories/${category.id}/edit`}>
                            <button aria-label={`Edit ${category.name}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </Link>
                        {/* Delete */}
                        <button
                            onClick={() => onDelete(category.id, category.name)}
                            aria-label={`Delete ${category.name}`}
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
        </div>
    );
}

export default function CategoriesPage() {
    const { rid } = useParams<{ rid: string }>();
    const { toast, confirm } = useGlobalUI();
    const [cats, setCats] = useState<Category[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = cats.findIndex(c => c.id === active.id);
        const newIndex = cats.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newCats = arrayMove(cats, oldIndex, newIndex);
        setCats(newCats);

        // Persist to Firestore
        try {
            await reorderCategories(rid, newCats.map(c => c.id));
        } catch {
            toast("Failed to save order", "error");
            await refresh(); // Revert on failure
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
                    <Card className="p-12 text-center rounded-3xl">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                </svg>
                            </div>
                            <p className="font-semibold text-gray-900 mb-1">No categories yet</p>
                            <p className="text-sm text-gray-400 mb-4">Add your first menu category to get started</p>
                            <Link href={`/admin/restaurants/${rid}/categories/new`}>
                                <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                                    + Add Category
                                </button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={cats.map(c => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {cats.map((c) => (
                                <SortableCategoryItem
                                    key={c.id}
                                    category={c}
                                    rid={rid}
                                    onDelete={handleDeleteCategory}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </Page>
    );
}
