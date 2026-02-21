"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { useGlobalUI } from "@/components/ui/Toast";
import { FontPicker } from "@/components/ui/FontPicker";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { FormSection, FormCard, FormField, FormRow, formInputClass, formInputRtlClass } from "@/components/ui/FormSection";
import {
    createRestaurant,
    uploadRestaurantImage,
} from "@/lib/data";

export default function RestaurantCreatePage() {
    const router = useRouter();
    const { toast } = useGlobalUI();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [themeColor, setThemeColor] = useState("#00ffff");
    const [layout, setLayout] = useState("list");
    const [dishColumns, setDishColumns] = useState(2);
    const [menuFont, setMenuFont] = useState("system");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);

    const [creating, setCreating] = useState(false);

    useUnsavedChanges(name.trim().length > 0);

    async function handleCreate() {
        if (!name.trim()) {
            toast("Please enter a restaurant name", "error");
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
                updates.imagePath = result.path;
            }

            if (bgFile) {
                const result = await uploadRestaurantImage(bgFile, rid, "background");
                updates.backgroundImagePath = result.path;
            }

            if (Object.keys(updates).length > 0) {
                await updateRestaurant(rid, updates);
            }

            toast("Restaurant created!");
            router.push(`/admin/restaurants/${rid}`);
        } catch (err) {
            console.error("Failed to create restaurant:", err);
            toast("Failed to create restaurant", "error");
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
            <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-1 mb-1">New Restaurant</h2>
                <p className="text-sm text-gray-400 px-1 mb-8">Set up your restaurant profile and menu appearance.</p>

                {/* ── Section 1: Restaurant Info ── */}
                <FormSection title="Restaurant Info" description="The name your customers will see on the menu page.">
                    <FormCard>
                        <FormField label="Name (English)" required>
                            <input
                                className={formInputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Luma Restaurant"
                            />
                        </FormField>
                        <FormField label="Name (Arabic)" hint="Shown when the customer switches to Arabic.">
                            <input
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                placeholder="الاسم بالعربي"
                                dir="rtl"
                            />
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* ── Section 2: Menu Appearance ── */}
                <FormSection title="Menu Appearance" description="Customize how your public menu looks to customers.">
                    <FormCard>
                        <FormRow label="Theme Color" hint="Accent color used on category tabs and dish prices.">
                            <ColorPicker value={themeColor} onChange={setThemeColor} />
                        </FormRow>
                    </FormCard>

                    <div className="mt-3">
                        <FormCard>
                            <FormField label="Menu Layout" hint="Classic Scroll shows all categories on one page. Category Grid shows one category at a time.">
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    {[
                                        { value: "list", label: "Classic Scroll" },
                                        { value: "grid", label: "Category Grid" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setLayout(opt.value)}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all no-min-tap ${
                                                layout === opt.value
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                            <FormField label="Dish Columns" hint="Number of columns in the dish grid on the public menu.">
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    {[1, 2, 3, 4].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setDishColumns(n)}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all no-min-tap ${
                                                dishColumns === n
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                            <FormField label="Menu Font" hint="Typography style for your customer-facing menu.">
                                <FontPicker value={menuFont} onChange={setMenuFont} />
                            </FormField>
                        </FormCard>
                    </div>
                </FormSection>

                {/* ── Section 3: Images ── */}
                <FormSection title="Images" description="Upload a logo and background for your menu's header area.">
                    {/* Logo */}
                    <div className="mb-4">
                        <p className="text-[13px] font-medium text-gray-500 px-1 mb-2">Logo</p>
                        <FormCard className="!divide-y-0">
                            <div className="p-6 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-green-50 text-green-800 rounded-2xl flex items-center justify-center mb-3 overflow-hidden">
                                    {logoFile ? (
                                        <img src={URL.createObjectURL(logoFile)} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                    )}
                                </div>
                                <p className="text-[12px] text-gray-400 mb-3">Square image, 1024×1024px recommended. Max 10 MB.</p>
                                <div className="flex items-center gap-3">
                                    <label className="px-4 py-2 bg-green-50 text-green-800 text-sm font-bold rounded-full cursor-pointer hover:bg-green-100 transition-colors">
                                        {logoFile ? "Change" : "Upload Logo"}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                                    </label>
                                    {logoFile && (
                                        <button
                                            onClick={() => setLogoFile(null)}
                                            className="px-4 py-2 text-red-500 text-sm font-bold rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </FormCard>
                    </div>

                    {/* Background */}
                    <div>
                        <p className="text-[13px] font-medium text-gray-500 px-1 mb-2">Background Image</p>
                        <div className="bg-white rounded-2xl border border-gray-200/60 h-40 flex items-center justify-center overflow-hidden relative">
                            {bgFile ? (
                                <>
                                    <img src={URL.createObjectURL(bgFile)} alt="" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                        <label className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors cursor-pointer" aria-label="Change background">
                                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                        </label>
                                        <button
                                            onClick={() => setBgFile(null)}
                                            aria-label="Remove background image"
                                            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                                    <span className="text-sm font-semibold text-gray-400 mt-2">Upload Background</span>
                                    <span className="text-[11px] text-gray-300 mt-1">2048×2048 or 1920×1080 recommended</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                </label>
                            )}
                        </div>
                    </div>
                </FormSection>

                <div className="h-20" />
            </div>
        </Page>
    );
}
