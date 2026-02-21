"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getDish, updateDish, uploadSequentialDishImages, Dish, deleteImageByPath, getRestaurant, getCategory } from "@/lib/data";
import { StorageImage } from "@/components/ui/StorageImage";

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

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Dish info</label>
                    <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-3xl">
                        <div className="px-6 py-4">
                            <input placeholder="Name (English)" className="w-full bg-transparent outline-none text-lg" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="px-6 py-4 text-right">
                            <input placeholder="Name (Arabic)" className="w-full bg-transparent outline-none text-lg text-right" value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" />
                        </div>
                        <div className="px-6 py-4">
                            <textarea placeholder="Description (English)" className="w-full bg-transparent outline-none text-sm resize-none h-20" value={desc} onChange={e => setDesc(e.target.value)} />
                        </div>
                        <div className="px-6 py-4 text-right">
                            <textarea placeholder="Description (Arabic)" className="w-full bg-transparent outline-none text-sm text-right resize-none h-20" value={descAr} onChange={e => setDescAr(e.target.value)} dir="rtl" />
                        </div>
                        <div className="px-6 py-4">
                            <input placeholder="Price" type="number" step="0.001" className="w-full bg-transparent outline-none text-lg" value={price} onChange={e => setPrice(e.target.value)} />
                        </div>
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Options (Optional)</label>
                    <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-3xl">
                        <div className="px-6 py-4">
                            <input placeholder="Header" className="w-full bg-transparent outline-none text-sm" value={optHeader} onChange={e => setOptHeader(e.target.value)} />
                        </div>
                        <div className="px-6 py-4 text-right">
                            <input placeholder="Header Arabic" className="w-full bg-transparent outline-none text-sm text-right" value={optHeaderAr} onChange={e => setOptHeaderAr(e.target.value)} dir="rtl" />
                        </div>
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span className="font-medium text-sm">Required</span>
                            <button onClick={() => setOptRequired(!optRequired)} className={`w-10 h-5 rounded-full transition-colors relative ${optRequired ? 'bg-green-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${optRequired ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <input placeholder="Max Selection" type="number" className="w-full bg-transparent outline-none text-sm" value={optMax} onChange={e => setOptMax(e.target.value)} />
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                            {optItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                                    <input placeholder="Name" className="flex-1 bg-transparent text-xs" value={item.name} onChange={e => {
                                        const newItems = [...optItems];
                                        newItems[idx].name = e.target.value;
                                        setOptItems(newItems);
                                    }} />
                                    <input placeholder="Arabic" className="flex-1 bg-transparent text-xs text-right" dir="rtl" value={item.nameAr} onChange={e => {
                                        const newItems = [...optItems];
                                        newItems[idx].nameAr = e.target.value;
                                        setOptItems(newItems);
                                    }} />
                                    <input placeholder="Price" className="w-16 bg-transparent text-xs" type="number" step="0.01" value={item.price} onChange={e => {
                                        const newItems = [...optItems];
                                        newItems[idx].price = e.target.value;
                                        setOptItems(newItems);
                                    }} />
                                    <button onClick={() => setOptItems(prev => prev.filter((_, i) => i !== idx))} aria-label="Remove option" className="text-red-500 text-xs">&#x2715;</button>
                                </div>
                            ))}
                            <button
                                onClick={() => setOptItems([...optItems, { name: "", nameAr: "", price: "" }])}
                                aria-label="Add option"
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center self-end hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                        </div>
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Allergens & Status</label>
                    <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-3xl">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span className="font-bold">Active</span>
                            <button onClick={() => setIsActive(!isActive)} className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                            {allergens.map((alg, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                                    <input placeholder="English" className="flex-1 bg-transparent text-xs" value={alg.name} onChange={e => {
                                        const newAllergens = [...allergens];
                                        newAllergens[idx].name = e.target.value;
                                        setAllergens(newAllergens);
                                    }} />
                                    <input placeholder="Arabic" className="flex-1 bg-transparent text-xs text-right" dir="rtl" value={alg.nameAr} onChange={e => {
                                        const newAllergens = [...allergens];
                                        newAllergens[idx].nameAr = e.target.value;
                                        setAllergens(newAllergens);
                                    }} />
                                    <button onClick={() => setAllergens(prev => prev.filter((_, i) => i !== idx))} aria-label="Remove allergen" className="text-red-500 text-xs">&#x2715;</button>
                                </div>
                            ))}
                            <button
                                onClick={() => setAllergens([...allergens, { name: "", nameAr: "" }])}
                                aria-label="Add allergen"
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center self-end hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                        </div>
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Images</label>
                    <p className="text-[11px] text-gray-400 px-4">Ideal: 2048 x 1536 px (4:3 ratio). Max 6 images, 10 MB each.</p>
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

                    <div className="flex flex-wrap gap-2 px-4">
                        {existingImages.map((img, idx) => (
                            <div key={`ex-${idx}`} className="relative w-20 h-20 group">
                                <StorageImage path={img.path} alt="" className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100" />
                                <button
                                    onClick={() => handleRemoveImage(idx, true)}
                                    aria-label="Remove image"
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 transition-colors"
                                >
                                    &#x2715;
                                </button>
                            </div>
                        ))}
                        {newImageFiles.map((file, idx) => (
                            <div key={`new-${idx}`} className="relative w-20 h-20 group">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Preview"
                                    className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100"
                                />
                                <button
                                    onClick={() => handleRemoveImage(idx, false)}
                                    aria-label="Remove image"
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 transition-colors"
                                >
                                    &#x2715;
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
                    <p className="text-xs text-gray-400 px-4 mt-2">{existingImages.length + newImageFiles.length}/6 images</p>
                </section>

                <div className="h-20" />
            </div>
        </Page>
    );
}
