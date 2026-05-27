"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
    DishOption
} from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";
import { getFontConfig } from "@/components/ui/FontPicker";

// --- Components ---

interface MenuProps {
    restaurant: Restaurant;
    categories: Category[];
    dishes: Dish[];
    modifierGroups: ModifierGroup[];
}

export default function PublicMenuPage() {
    const { rid } = useParams() as { rid: string };
    const [data, setData] = useState<MenuProps | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Menu State
    const [language, setLanguage] = useState<"en" | "ar">("en");
    const [fontScale, setFontScale] = useState(1.0);
    const [showSearch, setShowSearch] = useState(false);
    const [selectedDish, setSelectedDish] = useState<{ dishes: Dish[]; index: number } | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [gridSelectedCategory, setGridSelectedCategory] = useState<Category | null>(null);

    const loadData = useCallback(async () => {
        try {
            setError(null);
            const res = await getRestaurant(rid);
            if (!res) {
                setError("Restaurant not found");
                return;
            }

            const cats = await listCategories(rid);
            const activeCats = cats.filter(c => c.isActive);

            // Fetch all dishes for all active categories
            const allDishesPromises = activeCats.map(async c => {
                const d = await listDishes(rid, c.id);
                return d.map(dish => ({ ...dish, categoryId: c.id }));
            });
            const dishesArrays = await Promise.all(allDishesPromises);
            const allDishes = dishesArrays.flat().filter(d => d.isActive !== false);

            const mods = await listModifierGroups(rid);

            setData({
                restaurant: res,
                categories: activeCats,
                dishes: allDishes,
                modifierGroups: mods
            });

            if (res.layout !== "grid" && activeCats.length > 0) {
                setSelectedCategoryId(prev => prev ?? activeCats[0].id);
            }
        } catch (err: any) {
            console.error("Failed to load menu:", err);
            setError(err.message || "Failed to load menu data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [rid]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        if (refreshing) return;
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                <h1 className="text-2xl font-bold mb-2">Oops!</h1>
                <p className="text-gray-400">{error || "Something went wrong"}</p>
            </div>
        );
    }

    const { restaurant, categories, dishes, modifierGroups } = data;
    const isAr = language === "ar";
    const fontConfig = getFontConfig(restaurant.menuFont || "system");
    const accentColor = restaurant.themeColorHex || "#00ffff";

    const t = (en: string, ar?: string) => (isAr && ar ? ar : en);

    const cycleFontScale = () => {
        setFontScale(prev => prev < 1.14 ? 1.15 : 1.0);
    };

    const backgroundImage = restaurant.backgroundImagePath || "";

    // Content Area
    return (
        <div 
            className="min-h-screen bg-black text-white selection:bg-white/20 relative overflow-x-hidden"
            style={{ 
                ...fontConfig.style,
                fontSize: `${14 * fontScale}px`
            }}
        >
            {/* Background */}
            <div className="fixed inset-0 z-0">
                {backgroundImage ? (
                    <StorageImage 
                        path={backgroundImage} 
                        className="w-full h-full object-cover opacity-60"
                        alt=""
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black" />
                )}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col h-screen">
                {/* Header */}
                <header className="pt-6 pb-3 px-4 flex flex-col items-center gap-3 sticky top-0 bg-gradient-to-b from-black/90 to-transparent">
                    <div className="flex items-center justify-between w-full max-w-5xl gap-2">
                        {/* Leading Button */}
                        <div className="flex-shrink-0 min-w-[32px]">
                            {(gridSelectedCategory || selectedDish) && (
                                <button
                                    onClick={() => {
                                        if (selectedDish) setSelectedDish(null);
                                        else setGridSelectedCategory(null);
                                    }}
                                    className="w-9 h-9 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Title */}
                        <h1 
                            className="flex-1 text-xl font-bold text-center drop-shadow-lg line-clamp-1"
                            style={{ fontSize: `${20 * fontScale}px` }}
                        >
                            {t(restaurant.name, restaurant.nameAr)}
                        </h1>

                        {/* Trailing Buttons */}
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                            <button
                                onClick={handleRefresh}
                                className="w-9 h-9 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md"
                                title="Refresh"
                            >
                                <svg className={`w-[18px] h-[18px] ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 4v5h5M19.5 13a7.5 7.5 0 01-13.6 4.35M20 20v-5h-5M4.5 11a7.5 7.5 0 0113.6-4.35" />
                                </svg>
                            </button>
                            <button
                                onClick={cycleFontScale}
                                className="w-9 h-9 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center gap-0.5 hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md"
                                title="Adjust Font Size"
                            >
                                <span className="text-[10px] font-bold leading-none">A</span>
                                <span className="text-[14px] font-bold leading-none">A</span>
                            </button>
                            <button
                                onClick={() => setShowSearch(true)}
                                className="w-9 h-9 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md"
                                title="Search"
                            >
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => setLanguage(l => l === "en" ? "ar" : "en")}
                                className="w-9 h-9 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center font-bold text-xs hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md"
                                title="Toggle Language"
                            >
                                {isAr ? "EN" : "AR"}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto px-4 pb-20 no-scrollbar scroll-smooth">
                    <div className="max-w-5xl mx-auto w-full">
                        {restaurant.layout === "grid" ? (
                            <GridLayout 
                                categories={categories} 
                                dishes={dishes}
                                selectedCategory={gridSelectedCategory}
                                onSelectCategory={setGridSelectedCategory}
                                onSelectDish={(dish: Dish, categoryDishes: Dish[]) => {
                                    const idx = categoryDishes.findIndex((d: Dish) => d.id === dish.id);
                                    setSelectedDish({ dishes: categoryDishes, index: idx });
                                }}
                                t={t}
                                fontScale={fontScale}
                                restaurant={restaurant}
                            />
                        ) : (
                            <ListLayout 
                                categories={categories}
                                dishes={dishes}
                                selectedCategoryId={selectedCategoryId}
                                onSelectCategory={setSelectedCategoryId}
                                onSelectDish={(dish: Dish, categoryDishes: Dish[]) => {
                                    const idx = categoryDishes.findIndex((d: Dish) => d.id === dish.id);
                                    setSelectedDish({ dishes: categoryDishes, index: idx });
                                }}
                                t={t}
                                fontScale={fontScale}
                                restaurant={restaurant}
                                accentColor={accentColor}
                            />
                        )}
                    </div>
                </main>
            </div>


            {/* Overlays */}
            {showSearch && (
                <SearchOverlay 
                    categories={categories}
                    dishes={dishes}
                    onClose={() => setShowSearch(false)}
                    onSelectDish={(dish: Dish, categoryDishes: Dish[]) => {
                        const idx = categoryDishes.findIndex((d: Dish) => d.id === dish.id);
                        setSelectedDish({ dishes: categoryDishes, index: idx });
                        setShowSearch(false);
                    }}
                    t={t}
                    accentColor={accentColor}
                />
            )}

            {selectedDish && (
                <DishDetailOverlay 
                    dishes={selectedDish.dishes}
                    initialIndex={selectedDish.index}
                    onClose={() => setSelectedDish(null)}
                    t={t}
                    accentColor={accentColor}
                    modifierGroups={modifierGroups}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 0px;
                    background: transparent;
                }
                .glass {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .fade-in { animation: fadeIn 0.3s ease-out; }
                .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>
        </div>
    );
}

// --- Sub-Components ---

function ListLayout({ 
    categories, 
    dishes, 
    selectedCategoryId, 
    onSelectCategory, 
    onSelectDish,
    t,
    fontScale,
    restaurant,
    accentColor
}: { 
    categories: Category[]; 
    dishes: Dish[];
    selectedCategoryId: string | null;
    onSelectCategory: (id: string) => void;
    onSelectDish: (dish: Dish, catDishes: Dish[]) => void;
    t: (en: string, ar?: string) => string;
    fontScale: number;
    restaurant: Restaurant;
    accentColor: string;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const isScrollingRef = useRef(false);

    // Scroll sync: track which category is in view
    useEffect(() => {
        const observerOptions = {
            root: null,
            rootMargin: '-15% 0px -75% 0px', // Detect when header is near the top
            threshold: 0
        };

        const observerCallback = (entries: IntersectionObserverEntry[]) => {
            if (isScrollingRef.current) return; 

            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    onSelectCategory(entry.target.id);
                }
            });
        };

        const observer = new IntersectionObserver(observerCallback, observerOptions);
        
        Object.values(categoryRefs.current).forEach(el => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [categories, onSelectCategory]);

    const scrollToCategory = (id: string) => {
        isScrollingRef.current = true;
        onSelectCategory(id);
        categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
        
        // Resume observer after scroll completes
        setTimeout(() => {
            isScrollingRef.current = false;
        }, 1000);
    };

    // Keep horizontal strip in sync
    const stripRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    useEffect(() => {
        if (selectedCategoryId && itemRefs.current[selectedCategoryId]) {
            itemRefs.current[selectedCategoryId]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [selectedCategoryId]);

    return (
        <div className="flex flex-col gap-6">
            {/* Category Strip */}
            <div className="sticky top-0 z-20 py-3 -mx-4 px-4 bg-black/50 backdrop-blur-md overflow-x-auto no-scrollbar">
                <div className="flex gap-3 sm:gap-4">
                    {categories.map(cat => {
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <button
                                key={cat.id}
                                ref={el => { itemRefs.current[cat.id] = el; }}
                                onClick={() => scrollToCategory(cat.id)}
                                className="flex flex-col items-center gap-1.5 flex-shrink-0 transition-all active:scale-95 group"
                            >
                                <div className={`w-24 sm:w-32 aspect-[1.69/1] rounded-xl overflow-hidden transition-all ${
                                    isSelected ? "opacity-100" : "opacity-70 group-hover:opacity-90"
                                }`}>
                                    {cat.imagePath ? (
                                        <StorageImage path={cat.imagePath} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                        </div>
                                    )}
                                </div>
                                <span
                                    className="h-[3px] w-full rounded-full transition-all"
                                    style={{ backgroundColor: isSelected ? accentColor : "transparent" }}
                                />
                                <span className={`text-[11px] sm:text-xs text-center max-w-[96px] sm:max-w-[128px] truncate transition-all ${
                                    isSelected ? "text-white font-bold" : "text-white/60 font-medium"
                                }`}>
                                    {t(cat.name, cat.nameAr)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Dishes by Category */}
            <div className="flex flex-col gap-12 pt-4">
                {categories.map(cat => {
                    const catDishes = dishes.filter((d: Dish) => (d as any).categoryId === cat.id);
                    if (catDishes.length === 0) return null;

                    return (
                        <div 
                            key={cat.id} 
                            id={cat.id}
                            ref={el => { categoryRefs.current[cat.id] = el; }}
                            className="flex flex-col gap-4 scroll-mt-24"
                        >
                            <h2 className="text-xl sm:text-2xl font-bold px-2 drop-shadow-md text-center" style={{ fontSize: `${22 * fontScale}px` }}>
                                {t(cat.name, cat.nameAr)}
                            </h2>
                            <div className={`grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3`}>
                                {catDishes.map(dish => (
                                    <DishCard 
                                        key={dish.id} 
                                        dish={dish} 
                                        onClick={() => onSelectDish(dish, catDishes)}
                                        t={t}
                                        fontScale={fontScale}
                                        orientation={restaurant.cardImageOrientation}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function GridLayout({ 
    categories, 
    dishes, 
    selectedCategory, 
    onSelectCategory, 
    onSelectDish,
    t,
    fontScale,
    restaurant
}: { 
    categories: Category[]; 
    dishes: Dish[];
    selectedCategory: Category | null;
    onSelectCategory: (cat: Category | null) => void;
    onSelectDish: (dish: Dish, catDishes: Dish[]) => void;
    t: (en: string, ar?: string) => string;
    fontScale: number;
    restaurant: Restaurant;
}) {
    if (selectedCategory) {
        const catDishes = dishes.filter((d: Dish) => (d as any).categoryId === selectedCategory.id);
        return (
            <div className="flex flex-col gap-6 fade-in">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold drop-shadow-md" style={{ fontSize: `${28 * fontScale}px` }}>
                        {t(selectedCategory.name, selectedCategory.nameAr)}
                    </h2>
                </div>
                <div className={`grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3`}>
                    {catDishes.map(dish => (
                        <DishCard 
                            key={dish.id} 
                            dish={dish} 
                            onClick={() => onSelectDish(dish, catDishes)}
                            t={t}
                            fontScale={fontScale}
                            orientation={restaurant.cardImageOrientation}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 fade-in">
            {categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat)}
                    className="flex flex-col bg-black/80 rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all active:scale-95 group"
                >
                    <div className="aspect-[1.69/1] relative overflow-hidden">
                        {cat.imagePath ? (
                            <StorageImage path={cat.imagePath} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="p-4 text-center">
                        <span className="font-bold text-lg leading-tight" style={{ fontSize: `${20 * fontScale}px` }}>
                            {t(cat.name, cat.nameAr)}
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );
}

function DishCard({ 
    dish, 
    onClick, 
    t, 
    fontScale,
    orientation = "landscape"
}: { 
    dish: Dish; 
    onClick: () => void; 
    t: (en: string, ar?: string) => string;
    fontScale: number;
    orientation?: "landscape" | "portrait";
}) {
    const isPortrait = orientation === "portrait";
    const imgPath = dish.imagePaths?.[0];

    return (
        <button
            onClick={onClick}
            className="flex flex-col bg-black rounded-xl overflow-hidden border border-white/5 hover:border-white/20 transition-all active:scale-[0.98] group text-left"
        >
            <div className={`relative overflow-hidden ${isPortrait ? 'aspect-[3/4]' : 'aspect-[4/3]'}`}>
                {imgPath ? (
                    <StorageImage path={imgPath} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                    <div className="w-full h-full bg-gray-900/50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                    </div>
                )}
            </div>
            <div className="p-3 flex flex-col gap-0.5 bg-black text-left">
                <h3 className="font-bold text-xs sm:text-sm leading-tight line-clamp-2 text-white" style={{ fontSize: `${14 * fontScale}px` }}>
                    {t(dish.name, dish.nameAr)}
                </h3>
                <span className="text-white/70 text-[10px] sm:text-xs font-bold" style={{ fontSize: `${12 * fontScale}px` }}>
                    {dish.price.toFixed(3)}
                </span>
            </div>
        </button>
    );
}

interface SearchOverlayProps {
    categories: Category[];
    dishes: Dish[];
    onClose: () => void;
    onSelectDish: (dish: Dish, categoryDishes: Dish[]) => void;
    t: (en: string, ar?: string) => string;
    accentColor: string;
}

function SearchOverlay({ categories, dishes, onClose, onSelectDish, t, accentColor }: SearchOverlayProps) {
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const filtered = dishes.filter((d: Dish) => 
        d.name.toLowerCase().includes(query.toLowerCase()) || 
        (d.nameAr && d.nameAr.includes(query)) ||
        d.description?.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl fade-in flex flex-col">
            <div className="p-6 flex flex-col gap-6 max-w-2xl mx-auto w-full h-full">
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search dishes..."
                            className="w-full h-12 bg-white/10 border border-white/10 rounded-2xl px-11 outline-none focus:border-white/30 transition-all font-semibold"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button onClick={onClose} className="font-bold text-gray-400 hover:text-white transition-colors px-2">Cancel</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                    {query.length > 0 && filtered.map((dish: any) => (
                        <button 
                            key={dish.id} 
                            onClick={() => onSelectDish(dish, filtered)}
                            className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left group"
                        >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0">
                                {dish.imagePaths?.[0] ? (
                                    <StorageImage path={dish.imagePaths[0]} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg group-hover:text-white transition-colors">{t(dish.name, dish.nameAr)}</h4>
                                <p className="text-sm text-gray-400 font-bold">{dish.price} KD</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    ))}
                    {query.length > 0 && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                            <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <p className="font-bold">No dishes found matching "{query}"</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface DishDetailOverlayProps {
    dishes: Dish[];
    initialIndex: number;
    onClose: () => void;
    t: (en: string, ar?: string) => string;
    accentColor: string;
    modifierGroups: ModifierGroup[];
}

type OptionSection = {
    id: string;
    header: string;
    headerAr?: string;
    required?: boolean;
    items: DishOption[];
};

function buildOptionSections(dish: Dish, modifierGroups: ModifierGroup[]): OptionSection[] {
    const sections: OptionSection[] = [];

    // 1. Linked centralized modifier groups
    dish.modifierGroupIds?.forEach(mgId => {
        const mg = modifierGroups.find(g => g.id === mgId);
        if (mg && mg.items.length > 0) {
            sections.push({ id: `mg-${mg.id}`, header: mg.name, headerAr: mg.nameAr, required: mg.required, items: mg.items });
        }
    });

    // 2. Per-dish custom options (web)
    if (dish.customOptions && dish.customOptions.items.length > 0) {
        sections.push({
            id: "custom",
            header: dish.customOptions.header,
            headerAr: dish.customOptions.headerAr,
            required: dish.customOptions.required,
            items: dish.customOptions.items,
        });
    }

    // 3. Legacy/iOS-native options (normalized into dish.options)
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

function DishDetailOverlay({ dishes, initialIndex, onClose, t, accentColor, modifierGroups }: DishDetailOverlayProps) {
    const [index, setIndex] = useState(initialIndex);
    const dish = dishes[index];
    const sections = buildOptionSections(dish, modifierGroups);

    const toolbarBtn = "w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E9E3D3] text-[#222] flex items-center justify-center hover:bg-[#ddd6c2] transition-all active:scale-95 shadow-md disabled:opacity-40 disabled:hover:bg-[#E9E3D3]";

    return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col slide-up">
            {/* Top Bar */}
            <div className="absolute top-0 inset-x-0 z-10 p-4 sm:p-6 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent">
                <button onClick={onClose} className={toolbarBtn}>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                            disabled={index === 0}
                            onClick={() => setIndex(index - 1)}
                            className={toolbarBtn}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button
                            disabled={index === dishes.length - 1}
                            onClick={() => setIndex(index + 1)}
                            className={toolbarBtn}
                        >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold tracking-widest">
                        {index + 1} / {dishes.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Image */}
                <div className="w-full aspect-[4/3] bg-gray-900">
                    {dish.imagePaths?.[0] ? (
                        <StorageImage path={dish.imagePaths[0]} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="px-6 pt-8 pb-16 flex flex-col gap-5 max-w-2xl mx-auto">
                    <div className="flex flex-col gap-1.5 text-center">
                        <h2 className="text-3xl sm:text-4xl font-bold">{t(dish.name, dish.nameAr)}</h2>
                        <span className="text-xl sm:text-2xl font-bold text-white/90">{dish.price.toFixed(3)}</span>
                    </div>

                    {dish.description && (
                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed text-center">{t(dish.description, dish.descriptionAr)}</p>
                    )}

                    {/* Allergens */}
                    {dish.allergens && dish.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center">
                            {dish.allergens.map((a: DishAllergen, i: number) => (
                                <span key={a.id || i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-gray-400">
                                    {t(a.name, a.nameAr)}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Options / Modifiers */}
                    {sections.length > 0 && (
                        <div className="flex flex-col gap-6 mt-2 text-left">
                            {sections.map(section => (
                                <div key={section.id} className="flex flex-col">
                                    <div className="flex items-center justify-between pb-1">
                                        {section.header && (
                                            <h4 className="font-bold text-lg sm:text-xl">{t(section.header, section.headerAr)}</h4>
                                        )}
                                        {section.required && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-white/10 rounded-md text-white/50">Required</span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        {section.items
                                            .filter((item: DishOption) => item.isActive !== false)
                                            .map((item: DishOption, i: number) => (
                                                <div key={item.id || i} className="flex items-center justify-between py-3.5 border-b border-white/10">
                                                    <span className="font-bold text-base uppercase tracking-wide">{t(item.name, item.nameAr)}</span>
                                                    {(item.price ?? 0) > 0 && (
                                                        <span className="text-base font-bold opacity-70 whitespace-nowrap pl-3">+ {(item.price ?? 0).toFixed(3)}</span>
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
