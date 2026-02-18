"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Page } from "@/components/ui/Page";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { FontPicker } from "@/components/ui/FontPicker";
import {
    getRestaurant,
    updateRestaurant,
    listCategories,
    Category,
    uploadRestaurantImage,
    deleteCategory,
    deleteRestaurant,
    deleteImageByPath,
} from "@/lib/data";
import { useToast } from "@/components/ui/Toast";
import { StorageImage } from "@/components/ui/StorageImage";

export default function RestaurantManagePage() {
    const { rid } = useParams<{ rid: string }>();
    const router = useRouter();
    const { showToast, ToastComponent } = useToast();

    // Restaurant data
    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [themeColor, setThemeColor] = useState("#007aff");
    const [layout, setLayout] = useState("list");
    const [dishColumns, setDishColumns] = useState(2);
    const [menuFont, setMenuFont] = useState("system");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState("");
    const [bgUrl, setBgUrl] = useState("");
    const [logoPath, setLogoPath] = useState("");
    const [bgPath, setBgPath] = useState("");

    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const [cats, setCats] = useState<Category[]>([]);

    // Local Previews
    const [logoPreview, setLogoPreview] = useState("");
    const [bgPreview, setBgPreview] = useState("");
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (logoFile) {
            const url = URL.createObjectURL(logoFile);
            setLogoPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setLogoPreview("");
        }
    }, [logoFile]);

    useEffect(() => {
        if (bgFile) {
            const url = URL.createObjectURL(bgFile);
            setBgPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setBgPreview("");
        }
    }, [bgFile]);

    async function refresh() {
        const r = await getRestaurant(rid);
        if (r) {
            setName(r.name || "");
            setNameAr(r.nameAr || "");
            setThemeColor(r.themeColorHex || "#007aff");
            setLayout(r.layout || "list");
            setDishColumns(r.dishColumns || 2);
            setMenuFont(r.menuFont || "system");
            setLogoUrl(r.logo || "");
            setBgUrl(r.backgroundImage || "");
            setLogoPath(r.imagePath || r.logoPath || "");
            setBgPath(r.backgroundImagePath || "");
        }
        setCats(await listCategories(rid));
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
    }, [rid]);

    async function handleSave() {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const updates: any = {
                name: name.trim(),
                nameAr: nameAr.trim() || "",
                themeColorHex: themeColor,
                layout,
                dishColumns,
                menuFont,
            };

            // Handle Logo Upload with timeout/error safety
            if (logoFile) {
                try {
                    const result = await uploadRestaurantImage(logoFile, rid, "logo", (p) => {
                        setUploadProgress(prev => ({ ...prev, logo: p }));
                    });
                    updates.logo = result.url;
                    updates.logoPath = result.path;
                    updates.imagePath = result.path;
                    setLogoUrl(result.url);
                } catch (err) {
                    console.error("Logo upload failed:", err);
                    showToast("Logo upload failed, but settings will still save", "error");
                }
            }

            // Handle Background Upload with timeout/error safety
            if (bgFile) {
                try {
                    const result = await uploadRestaurantImage(bgFile, rid, "background", (p) => {
                        setUploadProgress(prev => ({ ...prev, background: p }));
                    });
                    updates.backgroundImage = result.url;
                    updates.backgroundImagePath = result.path;
                    setBgUrl(result.url);
                } catch (err) {
                    console.error("Background upload failed:", err);
                    showToast("Background upload failed, but settings will still save", "error");
                }
            }

            await updateRestaurant(rid, updates);

            // Clear files after successful upload
            setLogoFile(null);
            setBgFile(null);

            await refresh();
            showToast("Settings saved successfully!");
        } catch (err) {
            console.error("Save failed:", err);
            showToast("Failed to save changes. Please check your connection.", "error");
        } finally {
            setSaving(false);
            setUploadProgress({});
        }
    }

    async function handleDeleteCategory(id: string, catName: string) {
        if (!confirm(`Delete category "${catName}" and all its dishes?`)) return;
        try {
            await deleteCategory(rid, id);
            showToast("Category deleted");
            await refresh();
        } catch {
            showToast("Failed to delete category", "error");
        }
    }

    async function handleDeleteRestaurant() {
        if (!confirm(`Delete "${name}" and all its categories, dishes, and images? This cannot be undone.`)) return;
        try {
            await deleteRestaurant(rid);
            showToast("Restaurant deleted");
            setTimeout(() => router.push('/admin/restaurants'), 1000);
        } catch {
            showToast("Failed to delete restaurant", "error");
        }
    }

    async function handleRemoveLogo() {
        if (logoPath) {
            await deleteImageByPath(logoPath);
        }
        setLogoUrl("");
        setLogoPath("");
        setLogoFile(null);
        setLogoPreview("");
        await updateRestaurant(rid, { logo: "", logoPath: "", imagePath: "" } as any);
        showToast("Logo removed");
    }

    async function handleRemoveBg() {
        if (bgPath) {
            await deleteImageByPath(bgPath);
        }
        setBgUrl("");
        setBgPath("");
        setBgFile(null);
        setBgPreview("");
        await updateRestaurant(rid, { backgroundImage: "", backgroundImagePath: "" } as any);
        showToast("Background removed");
    }

    const actions = (
        <div className="flex items-center gap-1">
            <Link href={`/admin/restaurants/${rid}/categories`}>
                <button className="text-green-800 font-bold text-xs bg-green-50 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-green-100 transition-colors">
                    Edit Menu <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
            </Link>
            <Link href={`/restaurants/${rid}`}>
                <button className="p-1 px-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-5 h-5 text-gray-500 hover:text-green-600 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                </button>
            </Link>
        </div>
    );

    if (!loaded) return <Page title="Loading..."><div>Loading settings...</div></Page>;

    return (
        <Page title={name || rid} actions={actions} backPath="/">
            {/* Restaurant Details */}
            <div className="space-y-1 mb-8">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Restaurant Details</label>
                <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-2xl">
                    <input
                        className="w-full px-6 py-4 bg-transparent outline-none text-gray-900"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Restaurant name"
                    />
                    <input
                        className="w-full px-6 py-4 bg-transparent outline-none text-gray-900 text-right font-medium"
                        value={nameAr}
                        onChange={(e) => setNameAr(e.target.value)}
                        placeholder="لوما الحلقة الثانية"
                        dir="rtl"
                    />
                </Card>
            </div>

            {/* Theme Color */}
            <div className="space-y-1 mb-6">
                <Card className="p-4 flex items-center justify-between rounded-2xl">
                    <span className="font-bold">Theme Color</span>
                    <ColorPicker value={themeColor} onChange={setThemeColor} />
                </Card>
            </div>

            {/* Menu Layout */}
            <div className="space-y-1 mb-6">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Menu Layout</label>
                <Card className="p-1.5 rounded-2xl">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {[
                            { value: "list", label: "Classic Scroll" },
                            { value: "grid", label: "Category Grid" },
                        ].map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => setLayout(opt.value)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all ${
                                    layout === opt.value
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Dish Columns */}
            <div className="space-y-1 mb-6">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Dish Columns</label>
                <Card className="p-1.5 rounded-2xl">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {[1, 2, 3, 4].map((n) => (
                            <button
                                key={n}
                                onClick={() => setDishColumns(n)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                    dishColumns === n
                                        ? "bg-white text-gray-900 shadow-sm"
                                        : "text-gray-500"
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Menu Font */}
            <div className="space-y-1 mb-6">
                <FontPicker value={menuFont} onChange={setMenuFont} />
            </div>

            {/* Logo */}
            <div className="space-y-1 mb-6">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Logo</label>
                <Card className="p-8 flex flex-col items-center justify-center text-center rounded-3xl">
                    <div className="w-24 h-24 bg-green-50 text-green-800 rounded-3xl flex items-center justify-center mb-4 overflow-hidden">
                        {logoPreview ? (
                            <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                        ) : (logoPath || logoUrl) ? (
                            <StorageImage path={logoPath || logoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                        )}
                    </div>
                    <h3 className="font-bold text-xl mb-1">{name}</h3>
                    {uploadProgress.logo !== undefined && (
                        <div className="w-full max-w-[200px] mt-4">
                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-800 transition-all duration-300"
                                    style={{ width: `${uploadProgress.logo}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-green-800 mt-1 uppercase tracking-wider">Uploading {Math.round(uploadProgress.logo)}%</p>
                        </div>
                    )}
                </Card>
                <div className="px-4 flex items-center gap-3 mt-2">
                    <label className="text-green-800 text-sm font-bold cursor-pointer hover:underline">
                        {(logoPreview || logoUrl || logoPath) ? "Change logo" : "Select logo"}
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {(logoPreview || logoUrl || logoPath || logoFile) && (
                        <button
                            onClick={handleRemoveLogo}
                            className="text-red-500 text-sm font-bold hover:underline"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>

            {/* Background */}
            <div className="space-y-1 mb-10">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Background</label>
                <Card className="p-0 h-40 bg-gray-200 flex items-center justify-center rounded-3xl overflow-hidden relative">
                    {bgPreview ? (
                        <>
                            <img src={bgPreview} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                <label className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors cursor-pointer">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                </label>
                                <button
                                    onClick={handleRemoveBg}
                                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </>
                    ) : (bgPath || bgUrl) ? (
                        <>
                            <StorageImage path={bgPath || bgUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                <label className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors cursor-pointer">
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                </label>
                                <button
                                    onClick={handleRemoveBg}
                                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        </>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-300/50 transition-colors">
                            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                            <span className="text-sm font-bold text-gray-500 mt-2">Set background</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                        </label>
                    )}
                    {uploadProgress.background !== undefined && (
                        <div className="absolute inset-x-0 bottom-0 p-4 bg-black/50 backdrop-blur-sm">
                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white transition-all duration-300"
                                    style={{ width: `${uploadProgress.background}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-white mt-1 uppercase tracking-wider">Uploading {Math.round(uploadProgress.background)}%</p>
                        </div>
                    )}
                </Card>
            </div>

            <Button
                variant="primary-black"
                onClick={handleSave}
                loading={saving}
                disabled={saving || !name.trim()}
                className="mb-12"
            >
                Save Changes
            </Button>

            {/* Categories Section (as seen in mockup 4) */}
            <div className="space-y-4 pt-8 border-t border-gray-100">
                <div className="flex items-center justify-between px-4">
                    <h2 className="text-lg font-bold">Categories</h2>
                    <Link href={`/admin/restaurants/${rid}/categories/new`}>
                        <Button variant="ghost" className="text-green-800">+ Add</Button>
                    </Link>
                </div>
                <div className="space-y-2">
                    {cats.map((c) => (
                        <Card key={c.id} className="p-3 hover:bg-gray-50 transition-all rounded-2xl group">
                            <div className="flex items-center justify-between">
                                <Link href={`/admin/restaurants/${rid}/categories/${c.id}`} className="flex-1 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
                                    </div>
                                    <span className="font-bold text-blue-600">{c.name} {c.nameAr ? `(${c.nameAr})` : ''}</span>
                                </Link>
                                <div className="flex items-center gap-1">
                                    <Link href={`/admin/restaurants/${rid}/categories/${c.id}/edit`}>
                                        <button className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="pt-20 pb-10">
                <Card className="rounded-2xl p-0 overflow-hidden">
                    <button
                        onClick={handleDeleteRestaurant}
                        className="w-full px-6 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors font-bold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Restaurant
                    </button>
                </Card>
            </div>
            {ToastComponent}
        </Page>
    );
}
