"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getDish, updateDish, uploadSequentialDishImages, Dish, deleteImageByPath, getRestaurant, getCategory, listDishes, listModifierGroups, ModifierGroup } from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
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
    const [cardImageOrientation, setCardImageOrientation] = useState<"landscape" | "portrait">("landscape");
    const [catName, setCatName] = useState("");

    const [linkedModifiers, setLinkedModifiers] = useState<string[]>([]);
    const [availableModifiers, setAvailableModifiers] = useState<ModifierGroup[]>([]);
    
    // Allergens
    const [allergens, setAllergens] = useState<{ id?: string; name: string; nameAr: string }[]>([]);

    // Images
    const [existingImages, setExistingImages] = useState<{ url: string, path: string }[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});

    // Sibling dish navigation
    const [prevDishId, setPrevDishId] = useState<string | null>(null);
    const [nextDishId, setNextDishId] = useState<string | null>(null);
    const [prevDishName, setPrevDishName] = useState("");
    const [nextDishName, setNextDishName] = useState("");

    // Dirty tracking for unsaved changes
    const initialDataRef = useRef<string>("");
    const currentData = JSON.stringify({ name, nameAr, desc, descAr, price, isActive, optHeader, optHeaderAr, optRequired, optMax, optItems, allergens, linkedModifiers });
    const isDirty = loaded && currentData !== initialDataRef.current;
    useUnsavedChanges(isDirty);

    const navigateTo = useCallback((dishId: string) => {
        router.push(`/admin/restaurants/${rid}/categories/${cid}/${dishId}/edit`);
    }, [router, rid, cid]);

    // Keyboard nav: left/right arrows (only when not focused on an input)
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
            if (e.key === "ArrowLeft" && prevDishId) {
                e.preventDefault();
                navigateTo(prevDishId);
            } else if (e.key === "ArrowRight" && nextDishId) {
                e.preventDefault();
                navigateTo(nextDishId);
            }
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [prevDishId, nextDishId, navigateTo]);

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) {
                setRestaurantName(r.name || "");
                setCardImageOrientation(r.cardImageOrientation || "landscape");
            }
        });
        getCategory(rid, cid).then(c => {
            if (c) setCatName(c.name || "");
        });
        listModifierGroups(rid).then(mods => setAvailableModifiers(mods));
        // Fetch sibling dishes for prev/next navigation
        listDishes(rid, cid).then(allDishes => {
            const idx = allDishes.findIndex(d => d.id === did);
            if (idx > 0) {
                setPrevDishId(allDishes[idx - 1].id);
                setPrevDishName(allDishes[idx - 1].name || "");
            } else {
                setPrevDishId(null);
                setPrevDishName("");
            }
            if (idx >= 0 && idx < allDishes.length - 1) {
                setNextDishId(allDishes[idx + 1].id);
                setNextDishName(allDishes[idx + 1].name || "");
            } else {
                setNextDishId(null);
                setNextDishName("");
            }
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

                if (d.modifierGroupIds) {
                    setLinkedModifiers(d.modifierGroupIds);
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
                    optHeader: optionsRef?.header || "",
                    optHeaderAr: optionsRef?.headerAr || "",
                    optRequired: optionsRef?.required || false,
                    optMax: optionsRef?.maxSelection?.toString() || "",
                    optItems: optionsRef?.items?.map(i => ({
                        id: i.id,
                        name: i.name || "",
                        nameAr: i.nameAr || "",
                        price: i.price?.toString() || ""
                    })) || [],
                    allergens: d.allergens?.map(a => ({ id: a.id, name: a.name || "", nameAr: a.nameAr || "" })) || [],
                    linkedModifiers: d.modifierGroupIds || [],
                });
            }
            setLoaded(true);
        });
    }, [rid, cid, did]);

    async function handleSave() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            // Generate flattened iOS-compatible `options`
            let flattenedItems: any[] = [];

            for (const mid of linkedModifiers) {
                const mod = availableModifiers.find(m => m.id === mid);
                if (mod && mod.items && mod.items.length > 0) {
                    flattenedItems.push({ name: `${mod.name} :`, nameAr: mod.nameAr ? `${mod.nameAr} :` : "", price: 0 });
                    flattenedItems.push(...mod.items);
                }
            }

            const legacyOptionsObj = flattenedItems.length > 0 ? {
                header: "Options",
                headerAr: "خيارات",
                required: false,
                items: flattenedItems.map(i => ({ ...i, id: i.id || crypto.randomUUID() }))
            } : null;

            const updates: any = {
                name: name.trim(),
                nameAr: nameAr.trim(),
                description: desc.trim(),
                descriptionAr: descAr.trim(),
                price: parseFloat(price) || 0,
                isActive,
                modifierGroupIds: linkedModifiers,
                customOptions: null,
                options: legacyOptionsObj,
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
            onClick={() => router.push(`/admin/restaurants/${rid}/categories/${cid}`)}
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

                {/* Section 2a — Centralized Modifiers */}
                <FormSection title="Linked Modifiers" description="Attach global modifier groups to this dish. Manage them in the Restaurants > Modifiers tab.">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
                        {availableModifiers.length === 0 ? (
                            <p className="text-sm text-gray-400">No modifiers created yet.</p>
                        ) : (
                            availableModifiers.map(mod => (
                                <label key={mod.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={linkedModifiers.includes(mod.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) setLinkedModifiers([...linkedModifiers, mod.id]);
                                            else setLinkedModifiers(linkedModifiers.filter(id => id !== mod.id));
                                        }}
                                        className="w-5 h-5 rounded border-gray-300 text-green-700 focus:ring-green-700 focus:ring-offset-0 transition-colors cursor-pointer mt-0.5"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{mod.name}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {mod.items?.map(i => i.name).join(", ")}
                                        </p>
                                    </div>
                                </label>
                            ))
                        )}
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
                    <p className="text-[12px] text-gray-400 px-1 mb-3">
                        {cardImageOrientation === "portrait"
                            ? "2:3 portrait ratio recommended (1024×1536px). Max 10 MB each."
                            : "3:2 landscape ratio recommended (1536×1024px). Max 10 MB each."
                        }
                    </p>

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
                                <StorageImage path={img.path} alt="" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100" lightbox />
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
                                    className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100 cursor-zoom-in"
                                    onClick={() => setPreviewLightbox(URL.createObjectURL(file))}
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

                {/* Prev / Next dish navigation */}
                {(prevDishId || nextDishId) && (
                    <div className="flex items-center justify-between gap-3 px-1">
                        {prevDishId ? (
                            <button
                                onClick={() => navigateTo(prevDishId)}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group flex-1 min-w-0"
                            >
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-green-800 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                <div className="text-left min-w-0">
                                    <p className="text-[10px] text-gray-400 font-medium">Previous</p>
                                    <p className="text-sm font-semibold text-gray-700 truncate">{prevDishName}</p>
                                </div>
                            </button>
                        ) : <div className="flex-1" />}
                        {nextDishId ? (
                            <button
                                onClick={() => navigateTo(nextDishId)}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group flex-1 min-w-0"
                            >
                                <div className="text-right min-w-0 flex-1">
                                    <p className="text-[10px] text-gray-400 font-medium">Next</p>
                                    <p className="text-sm font-semibold text-gray-700 truncate">{nextDishName}</p>
                                </div>
                                <svg className="w-4 h-4 text-gray-400 group-hover:text-green-800 shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        ) : <div className="flex-1" />}
                    </div>
                )}

                <div className="h-20" />
            </div>

            {previewLightbox && (
                <ImageLightbox src={previewLightbox} alt="Preview" onClose={() => setPreviewLightbox(null)} />
            )}
        </Page>
    );
}
