"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useToast } from "@/components/ui/Toast";
import {
    createRestaurant,
    uploadRestaurantImage,
} from "@/lib/data";

export default function RestaurantCreatePage() {
    const router = useRouter();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [themeColor, setThemeColor] = useState("#00ffff");
    const [layout, setLayout] = useState("list");
    const [dishColumns, setDishColumns] = useState(2);
    const [menuFont, setMenuFont] = useState("system");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);

    const [creating, setCreating] = useState(false);

    async function handleCreate() {
        if (!name.trim()) {
            showToast("Please enter a restaurant name", "error");
            return;
        }
        setCreating(true);
        try {
            const { updateRestaurant } = await import("@/lib/data");
            const rid = await createRestaurant({
                name: name.trim(),
                nameAr: nameAr.trim(),
                themeColorHex: themeColor,
                layout,
                dishColumns,
                menuFont,
            });

            const updates: any = {};

            if (logoFile) {
                const result = await uploadRestaurantImage(logoFile, rid, "logo");
                updates.logo = result.url;
                updates.logoPath = result.path;
            }

            if (bgFile) {
                const result = await uploadRestaurantImage(bgFile, rid, "background");
                updates.backgroundImage = result.url;
                updates.backgroundImagePath = result.path;
            }

            if (Object.keys(updates).length > 0) {
                await updateRestaurant(rid, updates);
            }

            showToast("Restaurant created!");
            router.push(`/admin/restaurants/${rid}`);
        } catch (err) {
            console.error("Failed to create restaurant:", err);
            showToast("Failed to create restaurant", "error");
        } finally {
            setCreating(false);
        }
    }

    const actions = (
        <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="text-green-800 font-bold hover:opacity-70 disabled:opacity-30 transition-opacity"
        >
            {creating ? "..." : "Create"}
        </button>
    );

    const leftAction = (
        <button
            onClick={() => router.back()}
            className="text-green-800 font-medium hover:opacity-70 transition-opacity"
        >
            Cancel
        </button>
    );

    return (
        <Page title="New Restaurant" actions={actions} leftAction={leftAction}>
            {/* Restaurant */}
            <div className="space-y-1 mb-8">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Restaurant</label>
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
                        placeholder="الاسم بالعربي"
                        dir="rtl"
                    />
                </Card>
            </div>

            {/* Branding */}
            <div className="space-y-1 mb-6">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Branding</label>
                <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-2xl">
                    <div className="px-6 py-4 flex items-center justify-between">
                        <span className="font-medium">Theme Color</span>
                        <ColorPicker value={themeColor} onChange={setThemeColor} />
                    </div>
                </Card>
            </div>

            {/* Layout */}
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

            {/* Logo */}
            <div className="space-y-1 mb-6">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Logo</label>
                <Card className="p-8 flex flex-col items-center justify-center text-center rounded-3xl">
                    <div className="w-24 h-24 bg-green-50 text-green-800 rounded-3xl flex items-center justify-center mb-4 overflow-hidden">
                        {logoFile ? (
                            <img src={URL.createObjectURL(logoFile)} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                        )}
                    </div>
                    <div className="px-4">
                        <label className="text-green-800 text-sm font-bold cursor-pointer hover:underline inline-block mt-2">
                            Select logo
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                        </label>
                    </div>
                </Card>
            </div>

            {/* Restaurant background */}
            <div className="space-y-1 mb-10">
                <label className="text-xs font-bold text-gray-400 px-4 uppercase">Restaurant Background</label>
                <Card className="p-0 h-40 bg-gray-200 flex items-center justify-center rounded-3xl overflow-hidden relative">
                    {bgFile ? (
                        <img src={URL.createObjectURL(bgFile)} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9 2 2 2zm-11-7l2.03 2.71L15 11l4.25 5.67H5L10 12z" /></svg>
                    )}
                </Card>
                <div className="px-4">
                    <label className="text-green-800 text-sm font-bold cursor-pointer hover:underline inline-block mt-2">
                        Set background
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                    </label>
                </div>
            </div>

            <div className="h-20" />
            {ToastComponent}
        </Page>
    );
}
