"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { DishListSkeleton } from "@/components/ui/Skeleton";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    pointerWithin,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    Category,
    Dish,
    getRestaurant,
    listCategories,
    listDishes,
    updateDishAndMaybeMove,
} from "@/lib/data";

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
);

const GripIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
);

/* ── Right pane: a single draggable dish row ────────────────────────── */
const DraggableDish = memo(function DraggableDish({
    dish,
    fromCat,
    rid,
    categories,
    onMoveTo,
}: {
    dish: Dish;
    fromCat: string;
    rid: string;
    categories: Category[];
    onMoveTo: (dish: Dish, fromCat: string, toCat: string) => void;
}) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: dish.id,
        data: { dish, fromCat },
    });
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function onClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [menuOpen]);

    const otherCats = categories.filter((c) => c.id !== fromCat);

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center gap-1.5 pl-1 pr-2 py-2 rounded-xl border bg-white transition-colors ${
                isDragging ? "opacity-40 border-dashed border-green-400 bg-green-50/40" : "border-gray-100 hover:bg-gray-50"
            } ${dish.isActive === false ? "opacity-50" : ""}`}
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="p-1.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
                aria-label={`Drag ${dish.name}`}
            >
                <GripIcon />
            </button>

            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-blue-600 truncate">{dish.name}</p>
                {dish.price != null && (
                    <p className="text-[11px] text-gray-400 font-medium">KWD {dish.price.toFixed(3)}</p>
                )}
            </div>

            {/* Move-to menu (mobile / non-drag fallback) */}
            <div className="relative shrink-0" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-label={`Move ${dish.name} to another category`}
                    className="p-1.5 text-gray-400 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h13M3 12h9m-9 5h13M17 8l4 4-4 4" />
                    </svg>
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 max-h-64 overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-1">
                        <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">Move to…</p>
                        {otherCats.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-gray-400">No other categories</p>
                        ) : (
                            otherCats.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onMoveTo(dish, fromCat, c.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 transition-colors truncate"
                                >
                                    {c.name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Edit — reuses existing dish edit page */}
            <Link
                href={`/admin/restaurants/${rid}/categories/${fromCat}/${dish.id}/edit`}
                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                aria-label={`Edit ${dish.name}`}
            >
                <EditIcon />
            </Link>
        </div>
    );
});

/* ── Left pane: a condensed category row (selectable + drop target) ──── */
const CategoryRow = memo(function CategoryRow({
    category,
    count,
    rid,
    selected,
    onSelect,
    activeFromCat,
    dragging,
}: {
    category: Category;
    count: number;
    rid: string;
    selected: boolean;
    onSelect: (cid: string) => void;
    activeFromCat: string | null;
    dragging: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `target-${category.id}`, data: { catId: category.id } });

    const isSameCat = activeFromCat === category.id;
    const isValidTarget = dragging && !isSameCat;
    const highlight = isOver && isValidTarget;

    return (
        <div
            ref={setNodeRef}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(category.id)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(category.id);
                }
            }}
            className={`group w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                highlight
                    ? "border-green-600 bg-green-50 ring-2 ring-green-500/40"
                    : isValidTarget
                    ? "border-green-200 bg-white"
                    : selected
                    ? "border-green-200 bg-green-50/70"
                    : "border-transparent hover:bg-gray-100/70"
            }`}
        >
            <svg
                className={`w-4 h-4 shrink-0 ${selected ? "text-green-700" : "text-gray-400"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
            >
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
            </svg>
            <span className={`flex-1 min-w-0 truncate text-[13px] font-semibold ${selected ? "text-green-900" : "text-gray-800"}`}>
                {category.name}
                {category.nameAr ? <span className="font-normal text-gray-400"> {category.nameAr}</span> : null}
            </span>
            <span className={`text-[11px] font-semibold shrink-0 tabular-nums ${highlight ? "text-green-700" : "text-gray-400"}`}>
                {highlight ? "drop" : count}
            </span>
            {/* Edit — reuses existing category edit page */}
            <Link
                href={`/admin/restaurants/${rid}/categories/${category.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-0.5 text-blue-500 hover:bg-blue-50 rounded shrink-0"
                aria-label={`Edit ${category.name}`}
            >
                <EditIcon className="w-3.5 h-3.5" />
            </Link>
        </div>
    );
});

export default function OrganizePage() {
    const { rid } = useParams<{ rid: string }>();
    const { toast } = useGlobalUI();

    const [restaurantName, setRestaurantName] = useState("");
    const [cats, setCats] = useState<Category[]>([]);
    const [dishesByCat, setDishesByCat] = useState<Record<string, Dish[]>>({});
    const [selectedCat, setSelectedCat] = useState<string | null>(null);
    const [activeDrag, setActiveDrag] = useState<{ dish: Dish; fromCat: string } | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    // Keep a live ref of categories so callbacks can read the latest names
    // without re-creating (and without calling setState during render).
    const catsRef = useRef<Category[]>([]);
    catsRef.current = cats;

    // ── Custom edge auto-scroll ──────────────────────────────────────────
    // dnd-kit only auto-scrolls the dragged item's own scroll container, so
    // the *other* column never scrolls while dragging onto it. We scroll
    // whichever column the cursor is over instead.
    const leftScrollRef = useRef<HTMLDivElement>(null);
    const rightScrollRef = useRef<HTMLDivElement>(null);
    const pointer = useRef({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const onMove = (e: PointerEvent) => {
            pointer.current.x = e.clientX;
            pointer.current.y = e.clientY;
        };
        window.addEventListener("pointermove", onMove, { passive: true });
        return () => window.removeEventListener("pointermove", onMove);
    }, []);

    const stopAutoScroll = useCallback(() => {
        if (rafRef.current != null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const startAutoScroll = useCallback(() => {
        if (rafRef.current != null) return;
        const EDGE = 90; // px from top/bottom where scrolling kicks in
        const MAX = 16; // px per frame at the very edge
        const step = () => {
            const { x, y } = pointer.current;
            for (const el of [leftScrollRef.current, rightScrollRef.current]) {
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
                if (y < r.top + EDGE) {
                    el.scrollTop -= MAX * Math.min(1, (r.top + EDGE - y) / EDGE);
                } else if (y > r.bottom - EDGE) {
                    el.scrollTop += MAX * Math.min(1, (y - (r.bottom - EDGE)) / EDGE);
                }
            }
            rafRef.current = requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
    }, []);

    useEffect(() => stopAutoScroll, [stopAutoScroll]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const refresh = useCallback(async () => {
        try {
            const cl = await listCategories(rid);
            const entries = await Promise.all(
                cl.map(async (c) => [c.id, await listDishes(rid, c.id)] as const)
            );
            setCats(cl);
            setDishesByCat(Object.fromEntries(entries));
            setSelectedCat((prev) => prev ?? cl[0]?.id ?? null);
        } catch {
            toast("Failed to load menu", "error");
        }
        setLoaded(true);
    }, [rid, toast]);

    useEffect(() => {
        getRestaurant(rid).then((r) => r && setRestaurantName(r.name || ""));
        refresh();
    }, [rid, refresh]);

    const selectCat = useCallback((cid: string) => setSelectedCat(cid), []);

    const moveDish = useCallback(
        async (dish: Dish, fromCat: string, toCat: string) => {
            if (fromCat === toCat) return;

            // Optimistic update: remove from source, append to target
            let prevState: Record<string, Dish[]> = {};
            setDishesByCat((prev) => {
                prevState = prev;
                const from = (prev[fromCat] || []).filter((d) => d.id !== dish.id);
                const to = [...(prev[toCat] || []), dish];
                return { ...prev, [fromCat]: from, [toCat]: to };
            });

            try {
                await updateDishAndMaybeMove(rid, fromCat, toCat, dish.id, {});
                const toName = catsRef.current.find((c) => c.id === toCat)?.name || "category";
                toast(`Moved "${dish.name}" to ${toName}`);
            } catch {
                setDishesByCat(prevState); // revert
                toast("Failed to move dish", "error");
            }
        },
        [rid, toast]
    );

    function handleDragStart(e: DragStartEvent) {
        const data = e.active.data.current as { dish: Dish; fromCat: string } | undefined;
        if (data) setActiveDrag({ dish: data.dish, fromCat: data.fromCat });
        startAutoScroll();
    }

    function handleDragEnd(e: DragEndEvent) {
        setActiveDrag(null);
        stopAutoScroll();
        const { active, over } = e;
        if (!over) return;
        const fromCat = active.data.current?.fromCat as string | undefined;
        const toCat = over.data.current?.catId as string | undefined;
        const dish = active.data.current?.dish as Dish | undefined;
        if (!fromCat || !toCat || !dish || fromCat === toCat) return;
        moveDish(dish, fromCat, toCat);
    }

    const breadcrumbs = [
        { label: "Restaurants", href: "/admin/restaurants" },
        { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
        { label: "Organize" },
    ];

    if (!loaded)
        return (
            <Page title="Loading..." backPath={`/admin/restaurants/${rid}`} breadcrumbs={breadcrumbs}>
                <DishListSkeleton />
            </Page>
        );

    const activeFromCat = activeDrag?.fromCat ?? null;
    const selected = cats.find((c) => c.id === selectedCat) || null;
    const selectedDishes = selectedCat ? dishesByCat[selectedCat] || [] : [];

    return (
        <Page title="Organize Menu" backPath={`/admin/restaurants/${rid}`} breadcrumbs={breadcrumbs} fullHeight maxWidth="max-w-5xl">
            <p className="text-sm text-gray-500 px-1 mb-3 shrink-0">
                Click a category on the left to open its dishes, then drag a dish onto a different category to move it.
                On mobile, use the <span className="font-semibold text-gray-700">Move to…</span> button on each dish.
            </p>

            {cats.length === 0 ? (
                <Card className="p-12 text-center rounded-3xl">
                    <p className="font-semibold text-gray-900 mb-1">No categories yet</p>
                    <p className="text-sm text-gray-400 mb-4">Add a category to start organizing dishes.</p>
                    <Link href={`/admin/restaurants/${rid}/categories/new`}>
                        <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                            + Add Category
                        </button>
                    </Link>
                </Card>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={pointerWithin}
                    autoScroll={false}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => {
                        setActiveDrag(null);
                        stopAutoScroll();
                    }}
                >
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,300px)_1fr] gap-4 md:flex-1 md:min-h-0">
                        {/* ── Left pane: condensed category list (select + drop targets) ── */}
                        <div className="flex flex-col min-h-0 rounded-2xl border border-gray-100 bg-gray-50/40 p-2">
                            <div className="flex items-center justify-between px-1.5 pb-2 shrink-0">
                                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                                    Categories ({cats.length})
                                </h2>
                                <Link
                                    href={`/admin/restaurants/${rid}/categories/new`}
                                    className="text-xs font-bold text-green-800 hover:text-green-900"
                                >
                                    + Add
                                </Link>
                            </div>
                            <div ref={leftScrollRef} className="flex-1 md:overflow-y-auto min-h-0 space-y-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {cats.map((c) => (
                                    <CategoryRow
                                        key={c.id}
                                        category={c}
                                        count={(dishesByCat[c.id] || []).length}
                                        rid={rid}
                                        selected={c.id === selectedCat}
                                        onSelect={selectCat}
                                        activeFromCat={activeFromCat}
                                        dragging={!!activeDrag}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Right pane: dishes of the selected category (drag sources) ── */}
                        <div className="flex flex-col min-h-0">
                            <div className="flex items-center justify-between gap-2 px-1 pb-2 shrink-0">
                                <h2 className="text-sm font-bold text-gray-900 truncate">
                                    {selected ? (
                                        <>
                                            {selected.name}
                                            {selected.nameAr ? <span className="text-gray-400 font-medium"> ({selected.nameAr})</span> : null}
                                            <span className="text-gray-400 font-medium"> · {selectedDishes.length}</span>
                                        </>
                                    ) : (
                                        "Select a category"
                                    )}
                                </h2>
                                {selected && (
                                    <Link
                                        href={`/admin/restaurants/${rid}/categories/${selected.id}/new`}
                                        className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-white bg-green-800 hover:bg-green-900 rounded-full px-3 py-1.5 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" />
                                        </svg>
                                        Add dish
                                    </Link>
                                )}
                            </div>
                            <div ref={rightScrollRef} className="flex-1 md:overflow-y-auto min-h-0 space-y-1.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                {selectedDishes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-dashed border-gray-200 bg-white">
                                        <p className="font-semibold text-gray-700 mb-1">No dishes here</p>
                                        <p className="text-sm text-gray-400 mb-4">
                                            {selected ? `“${selected.name}” has no dishes yet.` : "Pick a category on the left."}
                                        </p>
                                        {selected && (
                                            <Link href={`/admin/restaurants/${rid}/categories/${selected.id}/new`}>
                                                <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                                                    + Add Dish
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    selectedDishes.map((d) => (
                                        <DraggableDish
                                            key={d.id}
                                            dish={d}
                                            fromCat={selectedCat as string}
                                            rid={rid}
                                            categories={cats}
                                            onMoveTo={moveDish}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Lifted card that follows the cursor.
                        Portaled to <body> so the ancestor `stagger-children` transform
                        doesn't break the overlay's fixed positioning / cursor tracking. */}
                    {mounted &&
                        createPortal(
                            <DragOverlay dropAnimation={null}>
                                {activeDrag ? (
                                    <div className="flex items-center gap-2 pl-1.5 pr-3 py-2 rounded-xl bg-white shadow-2xl ring-1 ring-green-600/30 cursor-grabbing">
                                        <GripIcon className="w-4 h-4 text-gray-300" />
                                        <span className="font-semibold text-sm text-blue-600">{activeDrag.dish.name}</span>
                                        {activeDrag.dish.price != null && (
                                            <span className="text-[11px] text-gray-400 font-medium">KWD {activeDrag.dish.price.toFixed(3)}</span>
                                        )}
                                    </div>
                                ) : null}
                            </DragOverlay>,
                            document.body
                        )}
                </DndContext>
            )}
        </Page>
    );
}
