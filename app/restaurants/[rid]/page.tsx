"use client";

import { useState, useEffect } from "react";
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
        import("@/lib/data").then(m => m.listAllDishes(rid)).then(setAllDishes);
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

    const fontConfig = getFontConfig(restaurant?.menuFont || 'system');

    if (loading) return (
        <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );

    if (!restaurant) return (
        <div className="min-h-screen bg-[#1c1c1e] flex items-center justify-center text-white/50">
            Restaurant not found
        </div>
    );

    return (
        <div className={`min-h-screen bg-[#1c1c1e] text-white ${fontConfig.class} antialiased relative overflow-hidden`}>
            {fontConfig.import && <link rel="stylesheet" href={fontConfig.import} />}

            {/* Background Texture & Image */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 pointer-events-none z-0" />
            {(restaurant.imagePath || restaurant.backgroundImagePath || restaurant.backgroundImage) && (
                <div className="absolute inset-0 z-0">
                    <StorageImage path={restaurant.imagePath || restaurant.backgroundImagePath || restaurant.backgroundImage} alt="" className="w-full h-full object-cover opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#1c1c1e] via-transparent to-[#1c1c1e]" />
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#1c1c1e]/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-white/5">
                <button onClick={() => router.push('/')} className="w-10 h-10 flex items-center justify-center text-white/40">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="text-center flex flex-col items-center">
                    {(restaurant.imagePath || restaurant.logoPath || restaurant.logo) ? (
                        <StorageImage path={restaurant.imagePath || restaurant.logoPath || restaurant.logo} alt={restaurant.name} className="h-8 w-auto object-contain mb-1" />
                    ) : (
                        <>
                            <p className="text-[10px] font-bold tracking-widest text-white/30 truncate max-w-[150px] mx-auto uppercase">
                                {lang === 'ar' ? "أهلاً بك" : "WELCOME"}
                            </p>
                            <h1 className="font-bold tracking-tight text-white/90">
                                {lang === 'ar' ? (restaurant.nameAr || restaurant.name) : restaurant.name}
                            </h1>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`w-8 h-8 flex items-center justify-center transition-colors ${showSearch ? 'text-cyan-400' : 'text-white/30'}`}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                        className={`px-2 py-0.5 rounded-full flex gap-1 text-[10px] font-bold transition-all border ${lang === 'ar' ? 'bg-cyan-500 border-cyan-500 text-white' : 'bg-white/5 border-white/10 text-white/30'}`}
                    >
                        <span>EN</span>
                        <span className="opacity-20">/</span>
                        <span>AR</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center text-white/30"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg></button>
                </div>
            </header>

            {/* Search Bar */}
            {showSearch && (
                <div className="sticky top-[73px] z-30 bg-[#1c1c1e] px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="relative">
                        <input
                            autoFocus
                            placeholder={lang === 'ar' ? "ابحث عن الأطباق..." : "Search dishes..."}
                            className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 outline-none text-sm font-medium focus:border-cyan-500/50 transition-all text-left"
                            style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        {searchTerm && (
                            <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">✕</button>
                        )}
                    </div>
                </div>
            )}

            {/* Categories Tabs */}
            <div className="sticky top-[73px] z-20 bg-[#1c1c1e]/90 backdrop-blur-md border-b border-white/5 no-scrollbar overflow-x-auto" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                <div className="flex px-4 items-center gap-2">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            id={`tab-${cat.id}`}
                            onClick={() => {
                                setActiveCid(cat.id);
                                if (restaurant?.layout === 'list') {
                                    document.getElementById(`section-${cat.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }}
                            className={`px-4 py-4 flex flex-col items-center gap-1 min-w-[80px] relative whitespace-nowrap text-[10px] font-bold transition-colors ${activeCid === cat.id ? 'text-white' : 'text-white/30'}`}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-1 transition-all ${activeCid === cat.id ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/5 text-white/30'} overflow-hidden`}>
                                {(cat.imagePath || cat.imageUrl) ? (
                                    <StorageImage path={cat.imagePath || cat.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                )}
                            </div>
                            {lang === 'ar' ? (cat.nameAr || cat.name) : cat.name}
                            {activeCid === cat.id && (
                                <div className="absolute bottom-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <main className="p-6 relative z-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                {searchTerm || restaurant?.layout !== 'list' ? (
                    <>
                        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-2xl font-bold tracking-tight">
                                {categories.find(c => c.id === activeCid)?.[lang === 'ar' ? 'nameAr' : 'name'] || categories.find(c => c.id === activeCid)?.name}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            {(searchTerm ? allDishes : dishes)
                                .filter(d =>
                                    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    (d.nameAr && d.nameAr.includes(searchTerm)) ||
                                    (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                    (searchTerm && (d as any).categoryName?.toLowerCase().includes(searchTerm.toLowerCase()))
                                )
                                .map(dish => (
                                    <div
                                        key={dish.id}
                                        onClick={() => setSelectedDish(dish)}
                                        className="bg-[#2c2c2e]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden group active:scale-95 transition-all shadow-xl"
                                    >
                                        <div className="aspect-square bg-white/5 relative overflow-hidden">
                                            {(dish.imagePaths?.[0] || dish.imageUrls?.[0]) ? (
                                                <StorageImage path={dish.imagePaths?.[0] || dish.imageUrls?.[0]} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/5">
                                                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 text-center">
                                            <h3 className="text-xs font-bold text-white/90 mb-1">{lang === 'ar' ? (dish.nameAr || dish.name) : dish.name}</h3>
                                            <p className="text-[10px] font-bold text-white/30">{dish.price?.toFixed(3)}</p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                ) : (
                    <div className="space-y-12">
                        {categories.map(cat => (
                            <section key={cat.id} id={`section-${cat.id}`} className="scroll-mt-[180px]">
                                <h2 className="text-2xl font-bold tracking-tight mb-6 px-2">{lang === 'ar' ? (cat.nameAr || cat.name) : cat.name}</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {allDishes.filter(d => d.categoryId === cat.id).map(dish => (
                                        <div
                                            key={dish.id}
                                            onClick={() => setSelectedDish(dish)}
                                            className="bg-[#2c2c2e]/50 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden group active:scale-95 transition-all shadow-xl"
                                        >
                                            <div className="aspect-square bg-white/5 relative overflow-hidden">
                                                {(dish.imagePaths?.[0] || dish.imageUrls?.[0]) ? (
                                                    <StorageImage path={dish.imagePaths?.[0] || dish.imageUrls?.[0]} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white/5">
                                                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 text-center">
                                                <h3 className="text-xs font-bold text-white/90 mb-1">{lang === 'ar' ? (dish.nameAr || dish.name) : dish.name}</h3>
                                                <p className="text-[10px] font-bold text-white/30">{dish.price?.toFixed(3)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {(searchTerm ? allDishes : dishes).length === 0 && (
                    <div className="py-20 text-center text-white/20 font-medium">
                        {searchTerm ? (lang === 'ar' ? "لا توجد أطباق تطابق بحثك." : "No dishes match your search.") : (lang === 'ar' ? "لا توجد أطباق في هذا القسم بعد." : "No dishes in this category yet.")}
                    </div>
                )}
            </main>

            {/* Dish Detail Popup */}
            {selectedDish && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedDish(null)} />
                    <div className="relative w-full max-w-lg bg-[#1c1c1e] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setSelectedDish(null)}
                            className="absolute top-6 right-6 z-10 w-8 h-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
                        >
                            ✕
                        </button>

                        <div className="aspect-[4/3] bg-white/5 relative overflow-hidden">
                            {(selectedDish.imagePaths?.[0] || selectedDish.imageUrls?.[0]) ? (
                                <StorageImage path={selectedDish.imagePaths?.[0] || selectedDish.imageUrls?.[0]} alt={selectedDish.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/10">
                                    <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-transparent to-transparent" />
                        </div>

                        <div className="p-8 text-center -mt-12 relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                            <h2 className="text-3xl font-bold tracking-tight mb-2">
                                {lang === 'ar' ? (selectedDish.nameAr || selectedDish.name) : selectedDish.name}
                            </h2>
                            <p className="text-xl font-bold text-white/30 mb-6">{selectedDish.price?.toFixed(3)}</p>

                            {(lang === 'ar' ? (selectedDish.descriptionAr || selectedDish.description) : selectedDish.description) && (
                                <p className="text-sm text-white/40 leading-relaxed max-w-sm mx-auto mb-8 font-medium">
                                    {lang === 'ar' ? (selectedDish.descriptionAr || selectedDish.description) : selectedDish.description}
                                </p>
                            )}

                            {selectedDish.allergens && selectedDish.allergens.length > 0 && (
                                <div className="mt-8 border-t border-white/5 pt-6">
                                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] mb-2">
                                        {lang === 'ar' ? "يحتوي على:" : "Contains:"}
                                    </p>
                                    <p className="text-xs text-red-500/80 font-bold">
                                        {selectedDish.allergens.map(a => lang === 'ar' ? (a.nameAr || a.name) : a.name).join(", ")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
