"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { StorageImage } from "@/components/ui/StorageImage";
import { DishListSkeleton } from "@/components/ui/Skeleton";
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
    Dish,
    deleteDish,
    getCategory,
    getRestaurant,
    listDishes,
    reorderDishes,
} from "@/lib/data";

function SortableDishItem({
    dish,
    rid,
    cid,
    onDelete,
}: {
    dish: Dish;
    rid: string;
    cid: string;
    onDelete: (dish: Dish) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: dish.id });

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

                    <Link href={`/admin/restaurants/${rid}/categories/${cid}/${dish.id}/edit`} className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 text-green-700 rounded-full flex items-center justify-center overflow-hidden">
                            {dish.imagePaths?.[0] ? (
                                <StorageImage path={dish.imagePaths[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-600">{dish.name}</h4>
                            {dish.price != null && (
                                <p className="text-xs text-gray-400 font-medium">KWD {dish.price.toFixed(3)}</p>
                            )}
                        </div>
                    </Link>
                    <div className="flex items-center gap-1">
                        {/* Edit */}
                        <Link href={`/admin/restaurants/${rid}/categories/${cid}/${dish.id}/edit`}>
                            <button aria-label={`Edit ${dish.name}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </Link>
                        {/* Delete */}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                onDelete(dish);
                            }}
                            aria-label={`Delete ${dish.name}`}
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

export default function CategoryManagePage() {
    const { rid, cid } = useParams<{ rid: string; cid: string }>();
    const { toast, confirm } = useGlobalUI();

    const [catName, setCatName] = useState("");
    const [restaurantName, setRestaurantName] = useState("");
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loaded, setLoaded] = useState(false);

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
            const cat = await getCategory(rid, cid);
            if (cat) {
                setCatName(cat.name || "");
            }
            setDishes(await listDishes(rid, cid));
        } catch {
            toast("Failed to load dishes", "error");
        }
        setLoaded(true);
    }

    const filteredDishes = dishes.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.nameAr && d.nameAr.includes(searchTerm)) ||
        (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Disable drag when searching
    const isSearching = searchTerm.trim().length > 0;

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
        refresh();
    }, [rid, cid]);

    async function handleDeleteDish(dish: Dish) {
        const ok = await confirm({ title: "Delete Dish", message: `Delete dish "${dish.name}"? This cannot be undone.`, destructive: true });
        if (!ok) return;
        try {
            await deleteDish(rid, cid, dish.id);
            toast("Dish deleted");
            await refresh();
        } catch {
            toast("Failed to delete dish", "error");
        }
    }

    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = dishes.findIndex(d => d.id === active.id);
        const newIndex = dishes.findIndex(d => d.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newDishes = arrayMove(dishes, oldIndex, newIndex);
        setDishes(newDishes);

        // Persist to Firestore
        try {
            await reorderDishes(rid, cid, newDishes.map(d => d.id));
        } catch {
            toast("Failed to save order", "error");
            await refresh(); // Revert on failure
        }
    }

    const actions = (
        <div className="flex items-center gap-2">
            <Link href={`/admin/restaurants/${rid}/categories/${cid}/edit`}>
                <button aria-label="Edit category" className="w-8 h-8 flex items-center justify-center bg-green-50 text-green-800 rounded-full hover:bg-green-100 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                </button>
            </Link>
            <Link href={`/admin/restaurants/${rid}/categories/${cid}/new`}>
                <button aria-label="Add new dish" className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </button>
            </Link>
        </div>
    );

    const breadcrumbs = [
        { label: "Restaurants", href: "/admin/restaurants" },
        { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
        { label: "Categories", href: `/admin/restaurants/${rid}/categories` },
        { label: catName || "Category" },
    ];

    if (!loaded) return (
        <Page title="Loading..." backPath={`/admin/restaurants/${rid}/categories`} breadcrumbs={breadcrumbs}>
            <DishListSkeleton />
        </Page>
    );

    return (
        <Page title={`${catName || cid} (${filteredDishes.length})`} actions={actions} backPath={`/admin/restaurants/${rid}/categories`} breadcrumbs={breadcrumbs}>
            <div className="space-y-4">
                <div className="relative px-2">
                    <input
                        placeholder="Search dishes..."
                        className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-gray-100 outline-none text-sm font-medium focus:border-green-800 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="space-y-2">
                    {filteredDishes.length === 0 ? (
                        <Card className="p-12 text-center rounded-3xl">
                            {searchTerm ? (
                                <p className="text-gray-500">No dishes match your search.</p>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-orange-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                        </svg>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">No dishes yet</p>
                                    <p className="text-sm text-gray-400 mb-4">Add your first dish to this category</p>
                                    <Link href={`/admin/restaurants/${rid}/categories/${cid}/new`}>
                                        <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                                            + Add Dish
                                        </button>
                                    </Link>
                                </div>
                            )}
                        </Card>
                    ) : isSearching ? (
                        // When searching, render without drag-and-drop
                        filteredDishes.map((d) => (
                            <Card key={d.id} className="p-3 hover:bg-gray-50 transition-all rounded-2xl group border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <Link href={`/admin/restaurants/${rid}/categories/${cid}/${d.id}/edit`} className="flex-1 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-50 text-green-700 rounded-full flex items-center justify-center overflow-hidden">
                                            {d.imagePaths?.[0] ? (
                                                <StorageImage path={d.imagePaths[0]} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-blue-600">{d.name}</h4>
                                            {d.price != null && (
                                                <p className="text-xs text-gray-400 font-medium">KWD {d.price.toFixed(3)}</p>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-1">
                                        <Link href={`/admin/restaurants/${rid}/categories/${cid}/${d.id}/edit`}>
                                            <button aria-label={`Edit ${d.name}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </Link>
                                        <button
                                            onClick={(e) => { e.preventDefault(); handleDeleteDish(d); }}
                                            aria-label={`Delete ${d.name}`}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                        <svg className="w-4 h-4 text-gray-300 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Card>
                        ))
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredDishes.map(d => d.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredDishes.map((d) => (
                                    <SortableDishItem
                                        key={d.id}
                                        dish={d}
                                        rid={rid}
                                        cid={cid}
                                        onDelete={handleDeleteDish}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </div>
        </Page>
    );
}
