"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { createDish, updateDish, uploadSequentialDishImages, getRestaurant, getCategory, listModifierGroups, ModifierGroup } from "@/lib/data";
import { FormSection, FormCard, FormField, FormRow, formInputClass, formTextareaClass, formInputRtlClass } from "@/components/ui/FormSection";

export default function NewDishPage() {
    const router = useRouter();
    const { rid, cid } = useParams<{ rid: string; cid: string }>();
    const { toast } = useGlobalUI();

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
    
    // Custom Options
    const [optHeader, setOptHeader] = useState("");
    const [optHeaderAr, setOptHeaderAr] = useState("");
    const [optRequired, setOptRequired] = useState(false);
    const [optMax, setOptMax] = useState("");
    const [optItems, setOptItems] = useState<{ name: string; nameAr: string; price: string }[]>([]);

    // Allergens
    const [allergens, setAllergens] = useState<{ name: string; nameAr: string }[]>([]);

    // Images
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [fileName: string]: number }>({});

    useUnsavedChanges(name.trim().length > 0);

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
    }, [rid, cid]);

    async function handleCreate() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const validCustomItems = optItems.filter(i => i.name.trim()).map(i => ({ ...i, price: parseFloat(i.price) || 0 }));
            const customOptionsObj = validCustomItems.length > 0 ? {
                header: optHeader,
                headerAr: optHeaderAr,
                required: optRequired,
                maxSelection: parseInt(optMax) || undefined,
                items: validCustomItems
            } : null;

            // Generate flattened iOS-compatible `options`
            let flattenedItems: any[] = [];
            
            // 1. Centralized modifiers
            for (const mid of linkedModifiers) {
                const mod = availableModifiers.find(m => m.id === mid);
                if (mod && mod.items && mod.items.length > 0) {
                    flattenedItems.push({ name: `${mod.name} :`, nameAr: mod.nameAr ? `${mod.nameAr} :` : "", price: 0 }); // Header proxy
                    flattenedItems.push(...mod.items);
                }
            }
            
            // 2. Custom options
            if (validCustomItems.length > 0) {
                if (optHeader) {
                    flattenedItems.push({ name: `${optHeader} :`, nameAr: optHeaderAr ? `${optHeaderAr} :` : "", price: 0 });
                }
                flattenedItems.push(...validCustomItems);
            }
            
            const legacyOptionsObj = flattenedItems.length > 0 ? {
                header: "Options",
                headerAr: "خيارات",
                required: false,
                items: flattenedItems.map(i => ({ ...i, id: crypto.randomUUID() }))
            } : null;

            // 1. Create the dish first to get its ID
            const dishData: any = {
                name: name.trim(),
                nameAr: nameAr.trim(),
                description: desc.trim(),
                descriptionAr: descAr.trim(),
                price: parseFloat(price) || 0,
                isActive,
                modifierGroupIds: linkedModifiers,
                customOptions: customOptionsObj,
                options: legacyOptionsObj,
                allergens: allergens.filter(a => a.name.trim()).length > 0 ? allergens.filter(a => a.name.trim()) : null
            };

            const dishId = await createDish(rid, cid, dishData);

            // 2. Upload images using the dish name for the correct storage path
            if (imageFiles.length > 0) {
                const results = await uploadSequentialDishImages(imageFiles, rid, cid, name.trim(), (idx, p) => {
                    const file = imageFiles[idx];
                    setUploadProgress(prev => ({ ...prev, [file.name]: p }));
                });
                const paths = results.map(r => r.path);
                await updateDish(rid, cid, dishId, { imagePaths: paths } as any);
            }

            toast("Dish created successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories/${cid}`), 1000);
        } catch (err: any) {
            console.error(err);
            toast(err.message || "Failed to create dish", "error");
            setBusy(false);
        }
    }

    const actions = (
        <button
            onClick={handleCreate}
            disabled={busy || !name.trim()}
            className="text-green-800 font-bold hover:opacity-70 disabled:opacity-30 transition-opacity"
        >
            {busy ? "..." : "Create"}
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
        { label: "New Dish" },
    ];

    return (
        <Page title="New Dish" actions={actions} leftAction={leftAction} breadcrumbs={breadcrumbs}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">New Dish</h2>

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

                {/* Section 2b — Options */}
                <FormSection title="Custom Options" description="Add specific options solely for this dish.">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Header config */}
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Header (English)</label>
                                    <input
                                        placeholder="e.g. Choose your size"
                                        className={formInputClass}
                                        value={optHeader}
                                        onChange={e => setOptHeader(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-medium text-gray-400 mb-1">Header (Arabic)</label>
                                    <input
                                        placeholder="e.g. اختر الحجم"
                                        className={formInputRtlClass}
                                        value={optHeaderAr}
                                        onChange={e => setOptHeaderAr(e.target.value)}
                                        dir="rtl"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setOptRequired(!optRequired)}
                                        role="switch"
                                        aria-checked={optRequired}
                                        aria-label="Required selection"
                                        className={`w-10 h-6 rounded-full transition-colors relative ${optRequired ? 'bg-green-600' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${optRequired ? 'left-[18px]' : 'left-0.5'}`} />
                                    </button>
                                    <span className="text-sm text-gray-600">Required</span>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-sm text-gray-600">Max</span>
                                    <input
                                        placeholder="∞"
                                        type="number"
                                        className={`${formInputClass} !w-16 text-center`}
                                        value={optMax}
                                        onChange={e => setOptMax(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Option items table */}
                        {optItems.length > 0 && (
                            <div className="border-t border-gray-100">
                                <div className="grid grid-cols-[1fr_1fr_80px_36px] gap-0 px-4 py-2 bg-gray-50/80">
                                    <span className="text-[11px] font-medium text-gray-400">Name</span>
                                    <span className="text-[11px] font-medium text-gray-400 text-right" dir="rtl">Arabic</span>
                                    <span className="text-[11px] font-medium text-gray-400 text-center">Price</span>
                                    <span />
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {optItems.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_1fr_80px_36px] gap-0 items-center group hover:bg-gray-50/50 transition-colors">
                                            <input
                                                placeholder="Name"
                                                className="w-full px-4 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-300"
                                                value={item.name}
                                                onChange={e => {
                                                    const newItems = [...optItems];
                                                    newItems[idx].name = e.target.value;
                                                    setOptItems(newItems);
                                                }}
                                            />
                                            <input
                                                placeholder="الاسم"
                                                className="w-full px-4 py-2.5 text-sm bg-transparent outline-none text-right placeholder:text-gray-300"
                                                dir="rtl"
                                                value={item.nameAr}
                                                onChange={e => {
                                                    const newItems = [...optItems];
                                                    newItems[idx].nameAr = e.target.value;
                                                    setOptItems(newItems);
                                                }}
                                            />
                                            <input
                                                placeholder="0.000"
                                                type="number"
                                                step="0.001"
                                                className="w-full px-2 py-2.5 text-sm bg-transparent outline-none text-center placeholder:text-gray-300"
                                                value={item.price}
                                                onChange={e => {
                                                    const newItems = [...optItems];
                                                    newItems[idx].price = e.target.value;
                                                    setOptItems(newItems);
                                                }}
                                            />
                                            <button
                                                onClick={() => setOptItems(prev => prev.filter((_, i) => i !== idx))}
                                                aria-label="Remove option"
                                                className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all mx-auto no-min-tap"
                                            >
                                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Add option button */}
                        <div className="border-t border-gray-100">
                            <button
                                onClick={() => setOptItems([...optItems, { name: "", nameAr: "", price: "" }])}
                                aria-label="Add option"
                                className="w-full py-3 text-center text-sm font-semibold text-gray-400 hover:text-green-800 hover:bg-gray-50 transition-colors"
                            >
                                + Add Option
                            </button>
                        </div>
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
                            setImageFiles(prev => {
                                const combined = [...prev, ...files];
                                return combined.slice(0, 6);
                            });
                        }}
                    />

                    {imageFiles.length > 0 && (
                        <div className="flex flex-wrap gap-3 mb-3">
                            {imageFiles.map((file, idx) => (
                                <div key={idx} className="relative w-24 h-24 group">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100"
                                    />
                                    <button
                                        onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
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
                    )}

                    <Card
                        onClick={() => document.getElementById('dish-images-upload')?.click()}
                        className="p-4 flex items-center justify-between rounded-3xl cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                            <span className="text-green-800 font-bold">
                                {imageFiles.length > 0 ? "Add more images" : "Select Images"}
                            </span>
                        </div>
                    </Card>
                    <p className="text-xs text-gray-400 px-1 mt-2">{imageFiles.length}/6 selected</p>
                </FormSection>

                <div className="h-20" />
            </div>
        </Page>
    );
}
