"use client";

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import {
    getRestaurant,
    listCategories,
    listDishes,
    listModifierGroups,
    Restaurant,
    Category,
    Dish,
    ModifierGroup,
    DishAllergen,
    DishOption,
} from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";
import { getFontConfig } from "@/components/ui/FontPicker";

// ──────────────────────────────────────────────────────────────────────────
//  Types
// ──────────────────────────────────────────────────────────────────────────

interface MenuData {
    restaurant: Restaurant;
    categories: Category[];
    dishes: Dish[];
    modifierGroups: ModifierGroup[];
}

type DishWithCat = Dish & { categoryId: string };

const CREAM_BTN =
    "w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#EAE3D2] text-[#1f1f1f] flex items-center justify-center shadow-md hover:bg-[#ddd5c1] active:scale-95 transition disabled:opacity-40 disabled:hover:bg-[#EAE3D2]";

// Generic plate/cutlery placeholder icon
const PlaceholderIcon = ({ className = "w-8 h-8 text-white/15" }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
);

// ──────────────────────────────────────────────────────────────────────────
//  Page
// ──────────────────────────────────────────────────────────────────────────

export default function PublicMenuPage() {
    const { rid } = useParams() as { rid: string };

    const [data, setData] = useState<MenuData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [language, setLanguage] = useState<"en" | "ar">("en");
    const [fontScale, setFontScale] = useState(1);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedDish, setSelectedDish] = useState<{ dishes: Dish[]; index: number } | null>(null);
    const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
    const [gridCategory, setGridCategory] = useState<Category | null>(null);

    // Layout / scroll machinery
    const topBarRef = useRef<HTMLDivElement>(null);
    const [topBarH, setTopBarH] = useState(0);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const stripItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const programmaticScroll = useRef(false);

    // ── Data ──────────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            setError(null);
            const res = await getRestaurant(rid);
            if (!res) {
                setError("Restaurant not found");
                return;
            }
            const cats = (await listCategories(rid)).filter((c) => c.isActive);
            const dishArrays = await Promise.all(
                cats.map(async (c) => (await listDishes(rid, c.id)).map((d) => ({ ...d, categoryId: c.id })))
            );
            const dishes = dishArrays.flat().filter((d) => d.isActive !== false);
            const modifierGroups = await listModifierGroups(rid);

            setData({ restaurant: res, categories: cats, dishes, modifierGroups });
            if (res.layout !== "grid" && cats.length) {
                setActiveCategoryId((prev) => prev ?? cats[0].id);
            }
        } catch (err) {
            console.error("Failed to load menu:", err);
            setError(err instanceof Error ? err.message : "Failed to load menu data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [rid]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const isList = data ? data.restaurant.layout !== "grid" : true;

    // ── Measure the sticky top bar so sections can offset under it ──────────
    useLayoutEffect(() => {
        const el = topBarRef.current;
        if (!el) return;
        const update = () => setTopBarH(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [data, isList, gridCategory, fontScale, language]);

    // ── Highlight the section currently under the bar (list layout) ─────────
    useEffect(() => {
        if (!data || !isList || gridCategory || topBarH === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (programmaticScroll.current) return;
                const hit = entries.find((e) => e.isIntersecting);
                if (hit) setActiveCategoryId(hit.target.id);
            },
            { rootMargin: `-${topBarH + 4}px 0px -65% 0px`, threshold: 0 }
        );
        Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
        return () => observer.disconnect();
    }, [data, isList, gridCategory, topBarH]);

    // ── Keep the active chip centered in the strip ──────────────────────────
    useEffect(() => {
        if (!activeCategoryId) return;
        stripItemRefs.current[activeCategoryId]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
    }, [activeCategoryId]);

    const scrollToCategory = (id: string) => {
        const el = sectionRefs.current[id];
        if (!el) return;
        programmaticScroll.current = true;
        setActiveCategoryId(id);
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
            programmaticScroll.current = false;
        }, 700);
    };

    // ── Loading / error ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#16161a] to-black flex items-center justify-center">
                <div className="w-9 h-9 border-[3px] border-white/15 border-t-white/80 rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#16161a] to-black flex flex-col items-center justify-center text-white p-6 text-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Oops!</h1>
                <p className="text-white/50">{error || "Something went wrong"}</p>
            </div>
        );
    }

    // ── Derived ─────────────────────────────────────────────────────────────
    const { restaurant, categories, dishes, modifierGroups } = data;
    const isAr = language === "ar";
    const fontConfig = getFontConfig(restaurant.menuFont || "system");
    const accent = restaurant.themeColorHex || "#ffffff";
    const t = (en: string, ar?: string) => (isAr && ar ? ar : en);
    const cycleFontScale = () => setFontScale((p) => (p < 1.14 ? 1.15 : 1));
    const openDish = (dish: Dish, list: Dish[]) =>
        setSelectedDish({ dishes: list, index: list.findIndex((d) => d.id === dish.id) });
    const dishesFor = (catId: string) => dishes.filter((d) => (d as DishWithCat).categoryId === catId);
    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        loadData();
    };

    return (
        <div
            dir={isAr ? "rtl" : "ltr"}
            className="min-h-screen bg-black text-white selection:bg-white/20 relative"
            style={{ ...fontConfig.style, fontSize: `${14 * fontScale}px` }}
        >
            {/* Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {restaurant.backgroundImagePath ? (
                    <StorageImage
                        path={restaurant.backgroundImagePath}
                        className="w-full h-full object-cover opacity-45 scale-105"
                        alt=""
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1b1b21] via-[#0e0e12] to-black" />
                )}
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70" />
                <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 220px 50px rgba(0,0,0,0.7)" }} />
            </div>

            {/* Sticky top bar: header + (list) category strip */}
            <div ref={topBarRef} className="sticky top-0 z-40 bg-gradient-to-b from-black/90 to-black/45 backdrop-blur-md">
                <header className="px-4 pt-5 pb-3">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
                        <div className="min-w-[40px] flex-shrink-0">
                            {gridCategory && (
                                <button onClick={() => setGridCategory(null)} className={CREAM_BTN} title="Back">
                                    <svg className="w-5 h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        <h1
                            className="flex-1 text-center font-bold tracking-tight drop-shadow-lg line-clamp-1"
                            style={{ fontSize: `${21 * fontScale}px` }}
                        >
                            {t(restaurant.name, restaurant.nameAr)}
                        </h1>

                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button onClick={handleRefresh} className={CREAM_BTN} title="Refresh">
                                <svg
                                    className={`w-[18px] h-[18px] ${refreshing ? "animate-spin" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.2}
                                        d="M4 4v5h5M19.5 13a7.5 7.5 0 01-13.6 4.35M20 20v-5h-5M4.5 11a7.5 7.5 0 0113.6-4.35"
                                    />
                                </svg>
                            </button>
                            <button onClick={cycleFontScale} className={CREAM_BTN} title="Text size">
                                <span className="text-[10px] font-bold leading-none">A</span>
                                <span className="text-[14px] font-bold leading-none">A</span>
                            </button>
                            <button onClick={() => setShowSearch(true)} className={CREAM_BTN} title="Search">
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setLanguage((l) => (l === "en" ? "ar" : "en"))}
                                className={`${CREAM_BTN} text-xs font-bold`}
                                title="Language"
                            >
                                {isAr ? "EN" : "AR"}
                            </button>
                        </div>
                    </div>
                </header>

                {isList && !gridCategory && (
                    <nav className="border-t border-white/5">
                        <div className="max-w-5xl mx-auto overflow-x-auto no-scrollbar px-4 py-3">
                            <div className="flex gap-3 sm:gap-4">
                                {categories.map((cat) => {
                                    const active = activeCategoryId === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            ref={(el) => {
                                                stripItemRefs.current[cat.id] = el;
                                            }}
                                            onClick={() => scrollToCategory(cat.id)}
                                            className="group flex flex-col items-center gap-2 flex-shrink-0 w-24 sm:w-32"
                                        >
                                            <div
                                                className={`w-full aspect-[1.69/1] rounded-xl overflow-hidden ring-1 transition-all duration-300 ${
                                                    active ? "ring-white/0 shadow-lg shadow-black/40" : "ring-white/10 opacity-70 group-hover:opacity-100"
                                                }`}
                                                style={active ? { boxShadow: `0 8px 20px rgba(0,0,0,0.45)`, outline: `2px solid ${accent}` } : undefined}
                                            >
                                                {cat.imagePath ? (
                                                    <StorageImage path={cat.imagePath} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                        <PlaceholderIcon className="w-5 h-5 text-white/20" />
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                className="h-[3px] w-7 rounded-full transition-all"
                                                style={{ backgroundColor: active ? accent : "transparent" }}
                                            />
                                            <span
                                                className={`text-[11px] sm:text-xs text-center leading-tight max-w-full truncate transition-colors ${
                                                    active ? "text-white font-semibold" : "text-white/55"
                                                }`}
                                            >
                                                {t(cat.name, cat.nameAr)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </nav>
                )}
            </div>

            {/* Content */}
            <main className="relative z-10 max-w-5xl mx-auto w-full px-4 pt-7 pb-24">
                {isList ? (
                    <div className="flex flex-col gap-14">
                        {categories.map((cat) => {
                            const catDishes = dishesFor(cat.id);
                            if (!catDishes.length) return null;
                            return (
                                <section
                                    key={cat.id}
                                    id={cat.id}
                                    ref={(el) => {
                                        sectionRefs.current[cat.id] = el;
                                    }}
                                    style={{ scrollMarginTop: topBarH + 12 }}
                                    className="flex flex-col gap-6"
                                >
                                    <SectionHeading
                                        title={t(cat.name, cat.nameAr)}
                                        accent={accent}
                                        fontScale={fontScale}
                                    />
                                    <DishGrid
                                        dishes={catDishes}
                                        onSelect={(d) => openDish(d, catDishes)}
                                        t={t}
                                        fontScale={fontScale}
                                        orientation={restaurant.cardImageOrientation}
                                    />
                                </section>
                            );
                        })}
                    </div>
                ) : gridCategory ? (
                    (() => {
                        const catDishes = dishesFor(gridCategory.id);
                        return (
                            <div className="flex flex-col gap-6 fade-in">
                                <SectionHeading
                                    title={t(gridCategory.name, gridCategory.nameAr)}
                                    accent={accent}
                                    fontScale={fontScale}
                                />
                                <DishGrid
                                    dishes={catDishes}
                                    onSelect={(d) => openDish(d, catDishes)}
                                    t={t}
                                    fontScale={fontScale}
                                    orientation={restaurant.cardImageOrientation}
                                />
                            </div>
                        );
                    })()
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 fade-in">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setGridCategory(cat)}
                                className="flex flex-col bg-[#0d0d0f] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_4px_18px_rgba(0,0,0,0.45)] hover:ring-white/25 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.6)] active:scale-[0.98] transition-all duration-300 group"
                            >
                                <div className="aspect-[1.69/1] relative overflow-hidden">
                                    {cat.imagePath ? (
                                        <StorageImage
                                            path={cat.imagePath}
                                            className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <PlaceholderIcon />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                </div>
                                <div className="px-4 py-3.5 text-center">
                                    <span className="font-semibold tracking-tight" style={{ fontSize: `${18 * fontScale}px` }}>
                                        {t(cat.name, cat.nameAr)}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {/* Overlays */}
            {showSearch && (
                <SearchOverlay
                    dishes={dishes}
                    onClose={() => setShowSearch(false)}
                    onSelectDish={(dish, list) => {
                        openDish(dish, list);
                        setShowSearch(false);
                    }}
                    t={t}
                />
            )}

            {selectedDish && (
                <DishDetailOverlay
                    dishes={selectedDish.dishes}
                    initialIndex={selectedDish.index}
                    onClose={() => setSelectedDish(null)}
                    t={t}
                    accent={accent}
                    modifierGroups={modifierGroups}
                />
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(16px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                .fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                .slide-up {
                    animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
            `}</style>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────
//  Sub-components
// ──────────────────────────────────────────────────────────────────────────

function SectionHeading({ title, accent, fontScale }: { title: string; accent: string; fontScale: number }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <h2 className="font-bold tracking-tight text-center drop-shadow-md" style={{ fontSize: `${24 * fontScale}px` }}>
                {title}
            </h2>
            <span className="h-[3px] w-9 rounded-full opacity-80" style={{ backgroundColor: accent }} />
        </div>
    );
}

function DishGrid({
    dishes,
    onSelect,
    t,
    fontScale,
    orientation,
}: {
    dishes: Dish[];
    onSelect: (d: Dish) => void;
    t: (en: string, ar?: string) => string;
    fontScale: number;
    orientation?: "landscape" | "portrait";
}) {
    return (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3">
            {dishes.map((dish) => (
                <DishCard key={dish.id} dish={dish} onClick={() => onSelect(dish)} t={t} fontScale={fontScale} orientation={orientation} />
            ))}
        </div>
    );
}

function DishCard({
    dish,
    onClick,
    t,
    fontScale,
    orientation = "landscape",
}: {
    dish: Dish;
    onClick: () => void;
    t: (en: string, ar?: string) => string;
    fontScale: number;
    orientation?: "landscape" | "portrait";
}) {
    const imgPath = dish.imagePaths?.[0];
    const aspect = orientation === "portrait" ? "aspect-[3/4]" : "aspect-[4/3]";
    return (
        <button
            onClick={onClick}
            className="flex flex-col bg-[#0d0d0f] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_4px_18px_rgba(0,0,0,0.45)] hover:ring-white/25 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.6)] active:scale-[0.98] transition-all duration-300 group text-start"
        >
            <div className={`relative overflow-hidden ${aspect}`}>
                {imgPath ? (
                    <StorageImage path={imgPath} className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700 ease-out" />
                ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <PlaceholderIcon />
                    </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d0d0f] to-transparent" />
            </div>
            <div className="px-3 py-2.5 flex flex-col gap-1">
                <h3 className="font-semibold tracking-tight leading-snug line-clamp-2 text-white/95" style={{ fontSize: `${14 * fontScale}px` }}>
                    {t(dish.name, dish.nameAr)}
                </h3>
                <span className="font-semibold tabular-nums text-white/50" style={{ fontSize: `${12 * fontScale}px` }}>
                    {dish.price.toFixed(3)}
                </span>
            </div>
        </button>
    );
}

function SearchOverlay({
    dishes,
    onClose,
    onSelectDish,
    t,
}: {
    dishes: Dish[];
    onClose: () => void;
    onSelectDish: (dish: Dish, list: Dish[]) => void;
    t: (en: string, ar?: string) => string;
}) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const q = query.trim().toLowerCase();
    const filtered = q
        ? dishes.filter(
              (d) =>
                  d.name.toLowerCase().includes(q) ||
                  (d.nameAr && d.nameAr.includes(query.trim())) ||
                  d.description?.toLowerCase().includes(q)
          )
        : [];

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl fade-in flex flex-col">
            <div className="p-5 sm:p-6 flex flex-col gap-5 max-w-2xl mx-auto w-full h-full">
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search dishes…"
                            className="w-full h-12 bg-white/10 border border-white/10 rounded-2xl px-11 outline-none focus:border-white/30 transition font-medium"
                        />
                        <svg className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button onClick={onClose} className="font-semibold text-white/60 hover:text-white transition px-1">
                        Cancel
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-2.5">
                    {filtered.map((dish) => (
                        <button
                            key={dish.id}
                            onClick={() => onSelectDish(dish, filtered)}
                            className="flex items-center gap-4 p-2.5 bg-white/5 rounded-2xl hover:bg-white/10 transition text-start group"
                        >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                                {dish.imagePaths?.[0] ? (
                                    <StorageImage path={dish.imagePaths[0]} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <PlaceholderIcon className="w-6 h-6 text-white/20" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold truncate">{t(dish.name, dish.nameAr)}</h4>
                                <p className="text-sm text-white/50 font-semibold tabular-nums">{dish.price.toFixed(3)}</p>
                            </div>
                            <svg className="w-5 h-5 text-white/30 group-hover:text-white/60 transition rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    ))}
                    {q.length > 0 && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
                            <svg className="w-14 h-14 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p className="font-semibold">No dishes found for “{query}”</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Dish detail ─────────────────────────────────────────────────────────────

type OptionSection = {
    id: string;
    header: string;
    headerAr?: string;
    required?: boolean;
    items: DishOption[];
};

function buildOptionSections(dish: Dish, modifierGroups: ModifierGroup[]): OptionSection[] {
    const sections: OptionSection[] = [];

    dish.modifierGroupIds?.forEach((mgId) => {
        const mg = modifierGroups.find((g) => g.id === mgId);
        if (mg && mg.items.length > 0) {
            sections.push({ id: `mg-${mg.id}`, header: mg.name, headerAr: mg.nameAr, required: mg.required, items: mg.items });
        }
    });

    if (dish.customOptions && dish.customOptions.items.length > 0) {
        sections.push({
            id: "custom",
            header: dish.customOptions.header,
            headerAr: dish.customOptions.headerAr,
            required: dish.customOptions.required,
            items: dish.customOptions.items,
        });
    }

    if (dish.options && dish.options.items.length > 0) {
        sections.push({
            id: "options",
            header: dish.options.header,
            headerAr: dish.options.headerAr,
            required: dish.options.required,
            items: dish.options.items,
        });
    }

    return sections;
}

function DishDetailOverlay({
    dishes,
    initialIndex,
    onClose,
    t,
    accent,
    modifierGroups,
}: {
    dishes: Dish[];
    initialIndex: number;
    onClose: () => void;
    t: (en: string, ar?: string) => string;
    accent: string;
    modifierGroups: ModifierGroup[];
}) {
    const [index, setIndex] = useState(initialIndex);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dish = dishes[index];
    const sections = buildOptionSections(dish, modifierGroups);

    // Reset scroll when navigating between dishes
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, [index]);

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col slide-up">
            {/* Toolbar */}
            <div className="absolute top-0 inset-x-0 z-10 p-4 sm:p-6 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
                <button onClick={onClose} className={CREAM_BTN} title="Back">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className={CREAM_BTN}>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button disabled={index === dishes.length - 1} onClick={() => setIndex((i) => i + 1)} className={CREAM_BTN}>
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-widest">
                        {index + 1} / {dishes.length}
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar">
                {/* Image */}
                <div className="w-full aspect-[4/3] bg-gray-900 relative">
                    {dish.imagePaths?.[0] ? (
                        <StorageImage path={dish.imagePaths[0]} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <PlaceholderIcon className="w-16 h-16 text-white/15" />
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
                </div>

                {/* Info */}
                <div className="px-6 -mt-6 relative z-10 pb-16 flex flex-col gap-6 max-w-2xl mx-auto">
                    <div className="flex flex-col items-center gap-2.5 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight drop-shadow-lg">{t(dish.name, dish.nameAr)}</h2>
                        <span className="text-lg sm:text-xl font-semibold tabular-nums text-white/85">{dish.price.toFixed(3)}</span>
                        <span className="h-[3px] w-10 rounded-full opacity-80" style={{ backgroundColor: accent }} />
                    </div>

                    {dish.description && (
                        <p className="text-white/70 text-sm sm:text-base leading-relaxed text-center max-w-xl mx-auto">
                            {t(dish.description, dish.descriptionAr)}
                        </p>
                    )}

                    {dish.allergens && dish.allergens.length > 0 && (
                        <div className="mx-auto flex w-fit max-w-full items-center gap-2.5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-2.5">
                            <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                                />
                            </svg>
                            <p className="text-sm leading-snug text-red-200/90 text-start">
                                <span className="font-bold uppercase tracking-wide text-red-400">{t("Contains:", "يحتوي على:")}</span>{" "}
                                {dish.allergens.map((a: DishAllergen) => t(a.name, a.nameAr)).join(t(", ", "، "))}
                            </p>
                        </div>
                    )}

                    {sections.length > 0 && (
                        <div className="flex flex-col gap-7 mt-1 text-start">
                            {sections.map((section) => (
                                <div key={section.id} className="flex flex-col">
                                    <div className="flex items-center justify-between pb-1">
                                        {section.header && <h4 className="font-bold text-lg sm:text-xl">{t(section.header, section.headerAr)}</h4>}
                                        {section.required && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/10 rounded-md text-white/50">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        {section.items
                                            .filter((item) => item.isActive !== false)
                                            .map((item, i) => (
                                                <div key={item.id || i} className="flex items-center justify-between py-3.5 border-b border-white/10">
                                                    <span className="font-bold text-base uppercase tracking-wide">{t(item.name, item.nameAr)}</span>
                                                    {(item.price ?? 0) > 0 && (
                                                        <span className="text-base font-bold opacity-70 whitespace-nowrap px-3">
                                                            + {(item.price ?? 0).toFixed(3)}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
