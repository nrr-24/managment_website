"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { StorageImage } from "@/components/ui/StorageImage";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getCategory, getRestaurant, updateCategory, uploadCategoryImage, deleteImageByPath, Category } from "@/lib/data";
import { FormSection, FormCard, FormField, FormRow, formInputClass, formInputRtlClass } from "@/components/ui/FormSection";

export default function EditCategoryPage() {
    const router = useRouter();
    const { rid, cid } = useParams<{ rid: string; cid: string }>();
    const { toast } = useGlobalUI();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [iconPath, setIconPath] = useState<string | null>(null);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [limitAvailability, setLimitAvailability] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);
    const [restaurantName, setRestaurantName] = useState("");

    // Dirty tracking for unsaved changes
    const initialDataRef = useRef<string>("");
    const currentData = JSON.stringify({ name, nameAr, isActive, limitAvailability, startTime, endTime });
    useUnsavedChanges(loaded && currentData !== initialDataRef.current);

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
        getCategory(rid, cid).then(cat => {
            if (cat) {
                setName(cat.name || "");
                setNameAr(cat.nameAr || "");
                setIsActive(cat.isActive !== false);
                setIconPath(cat.imagePath || null);
                if (cat.availabilityStart) {
                    setLimitAvailability(true);
                    setStartTime(cat.availabilityStart);
                    setEndTime(cat.availabilityEnd || "17:00");
                }
                initialDataRef.current = JSON.stringify({
                    name: cat.name || "",
                    nameAr: cat.nameAr || "",
                    isActive: cat.isActive !== false,
                    limitAvailability: !!cat.availabilityStart,
                    startTime: cat.availabilityStart || "09:00",
                    endTime: cat.availabilityEnd || "17:00",
                });
            }
            setLoaded(true);
        });
    }, [rid, cid]);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            setIconPreview(URL.createObjectURL(file));
        }
    }

    async function handleRemoveIcon() {
        try {
            if (iconPath) {
                await deleteImageByPath(iconPath);
            }
            setIconPath(null);
            setIconFile(null);
            setIconPreview(null);
            await updateCategory(rid, cid, { imagePath: "" });
            toast("Icon removed");
        } catch (err) {
            console.error("Failed to remove icon:", err);
            toast("Failed to remove icon", "error");
        }
    }

    async function handleSave() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const updates: any = {
                name: name.trim(),
                nameAr: nameAr.trim(),
                isActive,
                availabilityStart: limitAvailability ? startTime : null,
                availabilityEnd: limitAvailability ? endTime : null,
            };

            if (iconFile) {
                try {
                    const { url, path } = await uploadCategoryImage(iconFile, rid, cid, (p) => {
                        setProgress(p);
                    });
                    updates.imagePath = path;
                } catch (err) {
                    console.error("Category icon upload failed:", err);
                    toast("Icon upload failed, but name will be updated", "error");
                }
            }

            await updateCategory(rid, cid, updates);

            // Clear file after success
            setIconFile(null);
            setIconPreview(null);

            toast("Category updated successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories`), 1000);
        } catch (err) {
            console.error("Save category failed:", err);
            toast("Failed to update category. Please check your connection.", "error");
        } finally {
            setBusy(false);
            setProgress(null);
        }
    }

    const actions = (
        <button
            onClick={handleSave}
            disabled={busy || !name.trim()}
            className="text-green-800 font-bold hover:opacity-70 disabled:opacity-30 transition-opacity"
        >
            {busy ? "..." : "Save"}
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

    const breadcrumbs = [
        { label: "Restaurants", href: "/admin/restaurants" },
        { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
        { label: "Categories", href: `/admin/restaurants/${rid}/categories` },
        { label: name || "Edit" },
    ];

    if (!loaded) return <Page title="Loading..." breadcrumbs={breadcrumbs}><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;

    return (
        <Page title="Edit Category" actions={actions} leftAction={leftAction} backPath={`/admin/restaurants/${rid}/categories`} breadcrumbs={breadcrumbs}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">Edit Category</h2>

                {/* Section 1 — Category Info */}
                <FormSection title="Category Info" description="Name your category as you'd like it to appear on the menu.">
                    <FormCard>
                        <FormField label="Name (English)" required>
                            <input
                                placeholder="e.g. Appetizers"
                                className={formInputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Name (Arabic)" hint="Shown when user switches to Arabic">
                            <input
                                placeholder="Name (Arabic)"
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* Section 2 — Settings */}
                <FormSection title="Settings" description="Control visibility and availability of this category.">
                    <FormCard>
                        <FormRow label="Active" hint="Inactive categories are hidden from the public menu">
                            <button
                                onClick={() => setIsActive(!isActive)}
                                role="switch"
                                aria-checked={isActive}
                                aria-label="Category active status"
                                className={`w-12 h-7 rounded-full transition-colors relative ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isActive ? 'left-6' : 'left-1'}`} />
                            </button>
                        </FormRow>
                        <FormRow label="Limit Availability" hint="Restrict this category to specific hours">
                            <button
                                onClick={() => setLimitAvailability(!limitAvailability)}
                                role="switch"
                                aria-checked={limitAvailability}
                                aria-label="Limit availability"
                                className={`w-12 h-7 rounded-full transition-colors relative ${limitAvailability ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${limitAvailability ? 'left-6' : 'left-1'}`} />
                            </button>
                        </FormRow>
                        {limitAvailability && (
                            <FormField label="Available Hours" hint="Category will only be visible during these hours">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        className="bg-gray-100 px-3 py-2 rounded-lg outline-none font-medium text-[15px]"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                    <span className="text-gray-400 text-sm">to</span>
                                    <input
                                        type="time"
                                        className="bg-gray-100 px-3 py-2 rounded-lg outline-none font-medium text-[15px]"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </FormField>
                        )}
                    </FormCard>
                </FormSection>

                {/* Section 3 — Category Icon */}
                <FormSection title="Category Icon" description="Optional image shown next to the category name on tabs.">
                    <input
                        type="file"
                        id="icon-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <FormCard>
                        <div
                            onClick={() => document.getElementById('icon-upload')?.click()}
                            className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center overflow-hidden">
                                    {iconPreview ? (
                                        <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                                    ) : iconPath ? (
                                        <StorageImage path={iconPath} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-green-800 font-bold text-[15px]">
                                        {iconPath || iconFile ? "Change icon" : "Select icon"}
                                    </span>
                                    {progress !== null && (
                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
                                            Uploading {Math.round(progress)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            {(iconPath || iconFile) && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveIcon(); }}
                                    aria-label="Remove icon"
                                    className="text-red-500 text-sm font-bold pr-2 hover:underline"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </FormCard>
                    <p className="text-[12px] text-gray-400 mt-2 px-1">1384x820px JPEG recommended. Max 10 MB.</p>
                </FormSection>

                <div className="h-20" />
            </div>
        </Page>
    );
}
