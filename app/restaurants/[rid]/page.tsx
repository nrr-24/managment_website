"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRestaurant, listCategories, listDishes, Restaurant, Category, Dish } from "@/lib/data";
import { getFontConfig } from "@/components/ui/FontPicker";
import { StorageImage } from "@/components/ui/StorageImage";

export default function PublicMenuPage() {
    const { rid } = useParams<{ rid: string }>();
    const router = useRouter();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCid, setActiveCid] = useState<string | null>(null);
    const [dishes, setDishes] = useState<Dish[]>([]);
    const [allDishes, setAllDishes] = useState<(Dish & { categoryName: string; categoryId: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [lang, setLang] = useState<'en' | 'ar'>('en');
    const tabsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!rid) return;
        setLoading(true);
        Promise.all([
            getRestaurant(rid),
            listCategories(rid)
        ]).then(([res, cats]) => {
            setRestaurant(res);
            setCategories(cats);
            if (cats.length > 0) setActiveCid(cats[0].id);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [rid]);

    useEffect(() => {
        if (!rid) return;
        import("@/lib/data").then(m => m.listAllDishes(rid)).then(setAllDishes).catch(err => {
            console.error("Failed to load dishes:", err);
        });
    }, [rid]);

    useEffect(() => {
        if (restaurant?.layout !== 'list' || categories.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveCid(entry.target.id.replace('section-', ''));
                }
            });
        }, { threshold: 0.2, rootMargin: '-20% 0px -60% 0px' });

        categories.forEach(cat => {
            const el = document.getElementById(`section-${cat.id}`);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [restaurant?.layout, categories]);

    useEffect(() => {
        if (searchTerm || restaurant?.layout === 'list') return;
        if (!rid || !activeCid) return;
        listDishes(rid, activeCid).then(setDishes);
    }, [rid, activeCid, searchTerm, restaurant?.layout]);

    // Scroll active tab into view
    useEffect(() => {
        if (!activeCid || !tabsRef.current) return;
        const tab = tabsRef.current.querySelector(`#tab-${activeCid}`);
        if (tab) tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeCid]);

    // Escape key closes dish modal
    useEffect(() => {
        if (!selectedDish) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedDish(null);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [selectedDish]);

    const fontConfig = getFontConfig(restaurant?.menuFont || 'system');
    const themeColor = restaurant?.themeColorHex || '#ffffff';
    const cols = restaurant?.dishColumns || 2;
    const gridClass = cols === 1 ? 'grid-cols-1' : cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : 'grid-cols-2';

    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin" />
        </div>
    );

    if (!restaurant) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 text-sm font-medium">
            Restaurant not found
        </div>
    );

    const isAr = lang === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';

    // Helper: get the display dishes based on search/layout
    const displayDishes = useMemo(() => {
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            return allDishes.filter(d =>
                d.name.toLowerCase().includes(term) ||
                (d.nameAr && d.nameAr.includes(searchTerm)) ||
                (d.description && d.description.toLowerCase().includes(term)) ||
                ((d as any).categoryName?.toLowerCase().includes(term))
            );
        }
        return dishes;
    }, [searchTerm, allDishes, dishes]);

    const DishCard = ({ dish, size = "normal" }: { dish: Dish; size?: "normal" | "compact" }) => (
        <div
            onClick={() => setSelectedDish(dish)}
            className="group cursor-pointer"
        >
            <div className={`${size === "compact" ? "rounded-2xl" : "rounded-3xl"} overflow-hidden bg-[#1a1a1a] border border-white/[0.04] hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-black/50`}>
                <div className={`${size === "compact" ? "aspect-[4/3]" : "aspect-square"} bg-[#111] relative overflow-hidden`}>
                    {dish.imagePaths?.[0] ? (
                        <StorageImage
                            path={dish.imagePaths[0]}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/[0.02] to-transparent">
                            <svg className="w-10 h-10 text-white/[0.06]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                            </svg>
                        </div>
                    )}
                </div>
                <div className="p-4" dir={dir}>
                    <h3 className="text-sm font-semibold text-white/90 leading-tight mb-1.5">
                        {isAr ? (dish.nameAr || dish.name) : dish.name}
                    </h3>
                    {dish.description && !isAr && (
                        <p className="text-xs text-white/30 leading-relaxed line-clamp-2 mb-2">{dish.description}</p>
                    )}
                    {dish.descriptionAr && isAr && (
                        <p className="text-xs text-white/30 leading-relaxed line-clamp-2 mb-2">{dish.descriptionAr || dish.description}</p>
                    )}
                    <p className="text-sm font-bold" style={{ color: themeColor }}>
                        {dish.price?.toFixed(3)}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white antialiased" style={fontConfig.style}>

            {/* Hero Section */}
            <div className="relative h-64 overflow-hidden">
                {restaurant.backgroundImagePath ? (
                    <>
                        <StorageImage
                            path={restaurant.backgroundImagePath}
                            alt=""
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[#0a0a0a]" />
                    </>
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]" />
                )}

                {/* Back button */}
                <button
                    onClick={() => router.back()}
                    aria-label="Go back"
                    className="absolute top-5 left-5 z-10 w-11 h-11 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors border border-white/10"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Controls */}
                <div className="absolute top-5 right-5 z-10 flex items-center gap-2">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        aria-label={showSearch ? "Close search" : "Search dishes"}
                        className={`w-11 h-11 backdrop-blur-md rounded-full flex items-center justify-center transition-all border ${showSearch ? 'bg-white text-black border-white' : 'bg-black/40 text-white/70 hover:text-white border-white/10'}`}
                    >
                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setLang(isAr ? 'en' : 'ar')}
                        aria-label={isAr ? "Switch to English" : "Switch to Arabic"}
                        className="h-11 px-4 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-white/70 hover:text-white transition-all border border-white/10"
                    >
                        {isAr ? 'EN' : 'AR'}
                    </button>
                </div>

                {/* Restaurant Info - overlapping hero bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 pb-0">
                    <div className="flex items-end gap-4">
                        {restaurant.imagePath && (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#0a0a0a] shadow-xl bg-[#1a1a1a] flex-shrink-0 translate-y-4">
                                <StorageImage
                                    path={restaurant.imagePath}
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                        <div className="pb-1 translate-y-4">
                            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg">
                                {isAr ? (restaurant.nameAr || restaurant.name) : restaurant.name}
                            </h1>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for overlapping content */}
            <div className="h-6" />

            {/* Search Bar */}
            {showSearch && (
                <div className="px-5 pb-4">
                    <div className="relative">
                        <input
                            autoFocus
                            placeholder={isAr ? "ابحث عن الأطباق..." : "Search dishes..."}
                            className="w-full h-12 pl-11 pr-10 rounded-xl bg-[#1a1a1a] border border-white/[0.06] outline-none text-sm font-medium focus:border-white/20 transition-all placeholder:text-white/20"
                            style={{ textAlign: isAr ? 'right' : 'left' }}
                            dir={dir}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white text-sm">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Category Tabs */}
            <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.04]">
                <div ref={tabsRef} className="flex overflow-x-auto no-scrollbar px-5 gap-2 py-3" dir={dir}>
                    {categories.map(cat => {
                        const isActive = activeCid === cat.id;
                        return (
                            <button
                                key={cat.id}
                                id={`tab-${cat.id}`}
                                onClick={() => {
                                    setActiveCid(cat.id);
                                    if (restaurant?.layout === 'list') {
                                        document.getElementById(`section-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-200 flex-shrink-0 ${
                                    isActive
                                        ? 'text-black shadow-lg'
                                        : 'bg-white/[0.04] text-white/40 hover:text-white/70 hover:bg-white/[0.07]'
                                }`}
                                style={isActive ? { backgroundColor: themeColor } : undefined}
                            >
                                {cat.imagePath && (
                                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                        <StorageImage path={cat.imagePath} alt="" className="w-full h-full object-cover" />
                                    </div>
                                )}
                                {isAr ? (cat.nameAr || cat.name) : cat.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content */}
            <main className="px-5 py-6" dir={dir}>
                {searchTerm ? (
                    /* Search Results */
                    <div>
                        <p className="text-xs font-medium text-white/30 mb-4">
                            {displayDishes.length} {isAr ? 'نتيجة' : 'results'}
                        </p>
                        <div className={`grid ${gridClass} gap-3`}>
                            {displayDishes.map(dish => (
                                <DishCard key={dish.id} dish={dish} />
                            ))}
                        </div>
                    </div>
                ) : restaurant?.layout !== 'list' ? (
                    /* Grid Layout - category-based */
                    <div>
                        <div className={`grid ${gridClass} gap-3`}>
                            {dishes.map(dish => (
                                <DishCard key={dish.id} dish={dish} />
                            ))}
                        </div>
                    </div>
                ) : (
                    /* List Layout - all sections */
                    <div className="space-y-10">
                        {categories.map(cat => {
                            const catDishes = allDishes.filter(d => d.categoryId === cat.id);
                            if (catDishes.length === 0) return null;
                            return (
                                <section key={cat.id} id={`section-${cat.id}`} className="scroll-mt-[60px]">
                                    <div className="flex items-center gap-3 mb-5">
                                        <h2 className="text-xl font-bold tracking-tight">
                                            {isAr ? (cat.nameAr || cat.name) : cat.name}
                                        </h2>
                                        <div className="flex-1 h-px bg-white/[0.06]" />
                                        <span className="text-xs text-white/20 font-medium">{catDishes.length}</span>
                                    </div>
                                    <div className={`grid ${gridClass} gap-3`}>
                                        {catDishes.map(dish => (
                                            <DishCard key={dish.id} dish={dish} />
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}

                {/* Empty States */}
                {!searchTerm && restaurant?.layout !== 'list' && dishes.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-white/20 text-sm font-medium">
                            {isAr ? "لا توجد أطباق في هذا القسم بعد." : "No dishes in this category yet."}
                        </p>
                    </div>
                )}
                {searchTerm && displayDishes.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-white/20 text-sm font-medium">
                            {isAr ? "لا توجد أطباق تطابق بحثك." : "No dishes match your search."}
                        </p>
                    </div>
                )}
            </main>

            {/* Dish Detail Modal */}
            {selectedDish && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={selectedDish.name}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedDish(null)} />
                    <div className="relative w-full max-w-lg bg-[#141414] border border-white/[0.06] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Close */}
                        <button
                            autoFocus
                            onClick={() => setSelectedDish(null)}
                            aria-label="Close dish details"
                            className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Image */}
                        {selectedDish.imagePaths?.[0] ? (
                            <div className="aspect-[16/10] bg-[#111] relative overflow-hidden">
                                <StorageImage
                                    path={selectedDish.imagePaths[0]}
                                    alt={selectedDish.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                            </div>
                        ) : (
                            <div className="h-8" />
                        )}

                        {/* Info */}
                        <div className="p-6 -mt-8 relative" dir={dir}>
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <h2 className="text-2xl font-bold tracking-tight flex-1">
                                    {isAr ? (selectedDish.nameAr || selectedDish.name) : selectedDish.name}
                                </h2>
                                <span className="text-lg font-bold flex-shrink-0 mt-1" style={{ color: themeColor }}>
                                    {selectedDish.price?.toFixed(3)}
                                </span>
                            </div>

                            {(isAr ? (selectedDish.descriptionAr || selectedDish.description) : selectedDish.description) && (
                                <p className="text-sm text-white/40 leading-relaxed mb-6">
                                    {isAr ? (selectedDish.descriptionAr || selectedDish.description) : selectedDish.description}
                                </p>
                            )}

                            {/* Dish Options */}
                            {selectedDish.options && selectedDish.options.header && (
                                <div className="border-t border-white/[0.06] pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                                            {isAr ? (selectedDish.options.headerAr || selectedDish.options.header) : selectedDish.options.header}
                                        </p>
                                        {selectedDish.options.required && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
                                                {isAr ? "مطلوب" : "Required"}
                                            </span>
                                        )}
                                        {selectedDish.options.maxSelection && (
                                            <span className="text-[9px] font-medium text-white/30">
                                                {isAr ? `حد أقصى ${selectedDish.options.maxSelection}` : `Max ${selectedDish.options.maxSelection}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        {selectedDish.options.items?.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-white/[0.03] rounded-xl">
                                                <span className="text-sm font-medium text-white/70">
                                                    {isAr ? (item.nameAr || item.name) : item.name}
                                                </span>
                                                {item.price !== undefined && item.price > 0 && (
                                                    <span className="text-xs font-bold" style={{ color: themeColor }}>
                                                        +{item.price.toFixed(3)}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedDish.allergens && selectedDish.allergens.length > 0 && (
                                <div className="border-t border-white/[0.06] pt-4">
                                    <p className="text-[11px] font-bold text-amber-500/80 uppercase tracking-wider mb-2">
                                        {isAr ? "يحتوي على" : "Allergens"}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedDish.allergens.map((a, i) => (
                                            <span key={i} className="text-xs font-medium text-amber-500/60 bg-amber-500/10 px-3 py-1 rounded-full">
                                                {isAr ? (a.nameAr || a.name) : a.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
