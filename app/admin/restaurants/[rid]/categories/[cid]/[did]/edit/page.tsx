"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getDish, updateDish, uploadSequentialDishImages, Dish, deleteImageByPath, getRestaurant, getCategory } from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";
import { FormSection, FormCard, FormField, FormRow, formInputClass, formTextareaClass, formInputRtlClass } from "@/components/ui/FormSection";

export default function EditDishPage() {
    const router = useRouter();
    const { rid, cid, did } = useParams<{ rid: string; cid: string; did: string }>();
    const { toast, confirm } = useGlobalUI();

    const [dish, setDish] = useState<Dish | null>(null);
    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [desc, setDesc] = useState("");
    const [descAr, setDescAr] = useState("");
    const [price, setPrice] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [restaurantName, setRestaurantName] = useState("");
    const [catName, setCatName] = useState("");

    // Options
    const [optHeader, setOptHeader] = useState("");
    const [optHeaderAr, setOptHeaderAr] = useState("");
    const [optRequired, setOptRequired] = useState(false);
    const [optMax, setOptMax] = useState("");
    const [optItems, setOptItems] = useState<{ id?: string; name: string; nameAr: string; price: string }[]>([]);

    // Allergens
    const [allergens, setAllergens] = useState<{ id?: string; name: string; nameAr: string }[]>([]);

    // Images
    const [existingImages, setExistingImages] = useState<{ url: string, path: string }[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});

    // Dirty tracking for unsaved changes
    const initialDataRef = useRef<string>("");
    const currentData = JSON.stringify({ name, nameAr, desc, descAr, price, isActive, optHeader, optHeaderAr, optRequired, optMax, optItems, allergens });
    useUnsavedChanges(loaded && currentData !== initialDataRef.current);

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
        getCategory(rid, cid).then(c => {
            if (c) setCatName(c.name || "");
        });
        getDish(rid, cid, did).then(d => {
            if (d) {
                setDish(d);
                setName(d.name || "");
                setNameAr(d.nameAr || "");
                setDesc(d.description || "");
                setDescAr(d.descriptionAr || "");
                setPrice(d.price?.toString() || "");
                setIsActive(d.isActive !== false);

                if (d.options) {
                    setOptHeader(d.options.header || "");
                    setOptHeaderAr(d.options.headerAr || "");
                    setOptRequired(d.options.required || false);
                    setOptMax(d.options.maxSelection?.toString() || "");
                    setOptItems(d.options.items?.map(i => ({
                        id: i.id,
                        name: i.name || "",
                        nameAr: i.nameAr || "",
                        price: i.price?.toString() || ""
                    })) || []);
                }

                setAllergens(d.allergens?.map(a => ({ id: a.id, name: a.name || "", nameAr: a.nameAr || "" })) || []);

                // Build existing images from imagePaths only
                const paths = d.imagePaths || [];
                const images = paths.map(p => ({ url: "", path: p }));
                setExistingImages(images);

                initialDataRef.current = JSON.stringify({
                    name: d.name || "",
                    nameAr: d.nameAr || "",
                    desc: d.description || "",
                    descAr: d.descriptionAr || "",
                    price: d.price?.toString() || "",
                    isActive: d.isActive !== false,
                    optHeader: d.options?.header || "",
                    optHeaderAr: d.options?.headerAr || "",
                    optRequired: d.options?.required || false,
                    optMax: d.options?.maxSelection?.toString() || "",
                    optItems: d.options?.items?.map(i => ({
                        id: i.id,
                        name: i.name || "",
                        nameAr: i.nameAr || "",
                        price: i.price?.toString() || ""
                    })) || [],
                    allergens: d.allergens?.map(a => ({ id: a.id, name: a.name || "", nameAr: a.nameAr || "" })) || [],
                });
            }
            setLoaded(true);
        });
    }, [rid, cid, did]);

    async function handleSave() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const updates: any = {
                name: name.trim(),
                nameAr: nameAr.trim(),
                description: desc.trim(),
                descriptionAr: descAr.trim(),
                price: parseFloat(price) || 0,
                isActive,
                options: optItems.filter(i => i.name.trim()).length > 0 ? {
                    header: optHeader,
                    headerAr: optHeaderAr,
                    required: optRequired,
                    maxSelection: parseInt(optMax) || undefined,
                    items: optItems.filter(i => i.name.trim()).map(i => ({ ...i, price: parseFloat(i.price) || 0 }))
                } : null,
                allergens: allergens.filter(a => a.name.trim()).length > 0 ? allergens.filter(a => a.name.trim()) : null
            };

            // Handle New Images with error safety
            let finalPaths = [...existingImages.map(img => img.path)];

            if (newImageFiles.length > 0) {
                const results = await uploadSequentialDishImages(newImageFiles, rid, cid, name.trim(), (idx, p) => {
                    const file = newImageFiles[idx];
                    setUploadProgress(prev => ({ ...prev, [file.name]: p }));
                });
                for (const res of results) {
                    finalPaths.push(res.path);
                }
            }

            updates.imagePaths = finalPaths;

            await updateDish(rid, cid, did, updates);
            toast("Dish updated successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories/${cid}`), 1000);
        } catch (err) {
            console.error("Save dish failed:", err);
            toast("Failed to update dish. Please check your connection.", "error");
        } finally {
            setBusy(false);
            setUploadProgress({});
        }
    }

    async function handleRemoveImage(idx: number, isExisting: boolean) {
        if (isExisting) {
            const img = existingImages[idx];
            const ok = await confirm({ title: "Delete Image", message: "Permanently delete this image from storage?", destructive: true });
            if (ok) {
                try {
                    await deleteImageByPath(img.path);
                    setExistingImages(prev => prev.filter((_, i) => i !== idx));
                } catch (err) {
                    console.error("Failed to delete image:", err);
                    toast("Failed to delete image", "error");
                }
            }
        } else {
            setNewImageFiles(prev => prev.filter((_, i) => i !== idx));
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
        { label: catName || "Category", href: `/admin/restaurants/${rid}/categories/${cid}` },
        { label: name || "Edit Dish" },
    ];

    if (!loaded) return <Page title="Loading..." breadcrumbs={breadcrumbs}><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;
    if (!dish) return <Page title="Not Found"><div className="text-center py-20 text-gray-400">Dish not found</div></Page>;

    return (
        <Page title="Edit Dish" actions={actions} leftAction={leftAction} backPath={`/admin/restaurants/${rid}/categories/${cid}`} breadcrumbs={breadcrumbs}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">Edit Dish</h2>

                {/* Section 1 — Dish Info */}
                <FormSection title="Dish Info" description="Basic details that appear on your menu card and detail view.">
                    <FormCard>
                        <FormField label="Name (English)" required>
                            <input
                                placeholder="e.g. Grilled Chicken"
                                className={formInputClass}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Name (Arabic)" hint="Shown when the customer switches to Arabic">
                            <input
                                placeholder="Name (Arabic)"
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={e => setNameAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>
                        <FormField label="Description (English)" hint="Brief description shown under the dish name">
                            <textarea
                                placeholder="Description (English)"
                                className={`${formTextareaClass} h-20`}
                                value={desc}
                                onChange={e => setDesc(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Description (Arabic)">
                            <textarea
                                placeholder="Description (Arabic)"
                                className={`${formTextareaClass} h-20 text-right`}
                                value={descAr}
                                onChange={e => setDescAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>
                        <FormField label="Price" required hint="Price in KWD (e.g. 2.500)">
                            <input
                                placeholder="0.000"
                                type="number"
                                step="0.001"
                                className={formInputClass}
                                value={price}
                                onChange={e => setPrice(e.target.value)}
                            />
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* Section 2 — Options */}
                <FormSection title="Options" description="Add selectable options like sizes, add-ons, or extras that customers can choose from.">
                    <FormCard>
                        <FormField label="Option Header (English)" hint="e.g. Choose your size, Select toppings">
                            <input
                                placeholder="Option Header (English)"
                                className={formInputClass}
                                value={optHeader}
                                onChange={e => setOptHeader(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Option Header (Arabic)">
                            <input
                                placeholder="Option Header (Arabic)"
                                className={formInputRtlClass}
                                value={optHeaderAr}
                                onChange={e => setOptHeaderAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>
                        <FormRow label="Required" hint="Customer must pick at least one option">
                            <button
                                onClick={() => setOptRequired(!optRequired)}
                                role="switch"
                                aria-checked={optRequired}
                                aria-label="Required selection"
                                className={`w-12 h-7 rounded-full transition-colors relative ${optRequired ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${optRequired ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                        </FormRow>
                        <FormField label="Max Selection" hint="Leave empty for unlimited selections">
                            <input
                                placeholder="Max Selection"
                                type="number"
                                className={formInputClass}
                                value={optMax}
                                onChange={e => setOptMax(e.target.value)}
                            />
                        </FormField>
                    </FormCard>

                    <div className="mt-3 space-y-3">
                        {optItems.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-400 mb-1">Name</label>
                                            <input
                                                placeholder="Name"
                                                className={formInputClass}
                                                value={item.name}
                                                onChange={e => {
                                                    const newItems = [...optItems];
                                                    newItems[idx].name = e.target.value;
                                                    setOptItems(newItems);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-400 mb-1">Arabic Name</label>
                                            <input
                                                placeholder="Arabic Name"
                                                className={formInputRtlClass}
                                                dir="rtl"
                                                value={item.nameAr}
                                                onChange={e => {
                                                    const newItems = [...optItems];
                                                    newItems[idx].nameAr = e.target.value;
                                                    setOptItems(newItems);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setOptItems(prev => prev.filter((_, i) => i !== idx))}
                                        aria-label="Remove option"
                                        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center ml-3 hover:bg-red-100 transition-colors no-min-tap"
                                    >
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Price</label>
                                    <input
                                        placeholder="0.000"
                                        className={formInputClass}
                                        type="number"
                                        step="0.01"
                                        value={item.price}
                                        onChange={e => {
                                            const newItems = [...optItems];
                                            newItems[idx].price = e.target.value;
                                            setOptItems(newItems);
                                        }}
                                    />
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setOptItems([...optItems, { name: "", nameAr: "", price: "" }])}
                            aria-label="Add option"
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm font-semibold text-gray-400 hover:border-green-800 hover:text-green-800 transition-colors"
                        >
                            + Add Option
                        </button>
                    </div>
                </FormSection>

                {/* Section 3 — Allergens */}
                <FormSection title="Allergens" description="List any allergens so customers can make informed choices.">
                    <div className="space-y-3">
                        {allergens.map((alg, idx) => (
                            <div key={idx} className="bg-white rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-400 mb-1">English</label>
                                            <input
                                                placeholder="Allergen name"
                                                className={formInputClass}
                                                value={alg.name}
                                                onChange={e => {
                                                    const newAllergens = [...allergens];
                                                    newAllergens[idx].name = e.target.value;
                                                    setAllergens(newAllergens);
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-gray-400 mb-1">Arabic</label>
                                            <input
                                                placeholder="Arabic name"
                                                className={formInputRtlClass}
                                                dir="rtl"
                                                value={alg.nameAr}
                                                onChange={e => {
                                                    const newAllergens = [...allergens];
                                                    newAllergens[idx].nameAr = e.target.value;
                                                    setAllergens(newAllergens);
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setAllergens(prev => prev.filter((_, i) => i !== idx))}
                                        aria-label="Remove allergen"
                                        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors no-min-tap"
                                    >
                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setAllergens([...allergens, { name: "", nameAr: "" }])}
                            aria-label="Add allergen"
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm font-semibold text-gray-400 hover:border-green-800 hover:text-green-800 transition-colors"
                        >
                            + Add Allergen
                        </button>
                    </div>
                </FormSection>

                {/* Section 4 — Status */}
                <FormSection title="Status" description="Control whether this dish appears on the public menu.">
                    <FormCard>
                        <FormRow label="Active" hint="Inactive dishes are hidden from customers">
                            <button
                                onClick={() => setIsActive(!isActive)}
                                role="switch"
                                aria-checked={isActive}
                                aria-label="Dish active status"
                                className={`w-12 h-7 rounded-full transition-colors relative ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                        </FormRow>
                    </FormCard>
                </FormSection>

                {/* Section 5 — Photos */}
                <FormSection title="Photos" description="Add up to 6 photos. The first image is used as the main photo on the menu card.">
                    <p className="text-[12px] text-gray-400 px-1 mb-3">4:3 ratio recommended (2048x1536px). Max 10 MB each.</p>

                    <input
                        type="file"
                        id="dish-images-upload"
                        multiple
                        className="hidden"
                        accept="image/*"
                        onChange={e => {
                            const files = Array.from(e.target.files || []);
                            setNewImageFiles(prev => [...prev, ...files]);
                        }}
                    />

                    <div className="flex flex-wrap gap-3 mb-3">
                        {existingImages.map((img, idx) => (
                            <div key={`ex-${idx}`} className="relative w-24 h-24 group">
                                <StorageImage path={img.path} alt="" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100" />
                                <button
                                    onClick={() => handleRemoveImage(idx, true)}
                                    aria-label="Remove image"
                                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shadow-sm hover:bg-red-100 transition-colors no-min-tap"
                                >
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                        {newImageFiles.map((file, idx) => (
                            <div key={`new-${idx}`} className="relative w-24 h-24 group">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Preview"
                                    className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100"
                                />
                                <button
                                    onClick={() => handleRemoveImage(idx, false)}
                                    aria-label="Remove image"
                                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shadow-sm hover:bg-red-100 transition-colors no-min-tap"
                                >
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                                {uploadProgress[file.name] !== undefined && (
                                    <div className="absolute inset-x-0 bottom-0 bg-green-800 text-white text-center text-[8px] font-bold py-0.5 rounded-b-xl">
                                        {Math.round(uploadProgress[file.name])}%
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {(existingImages.length + newImageFiles.length) < 6 && (
                        <Card
                            onClick={() => document.getElementById('dish-images-upload')?.click()}
                            className="p-4 flex items-center justify-between rounded-3xl cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </div>
                                <span className="text-green-800 font-bold">Add more images</span>
                            </div>
                        </Card>
                    )}
                    <p className="text-xs text-gray-400 px-1 mt-2">{existingImages.length + newImageFiles.length}/6 images</p>
                </FormSection>

                <div className="h-20" />
            </div>
        </Page>
    );
}
