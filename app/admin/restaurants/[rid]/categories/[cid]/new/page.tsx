"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { createDish, updateDish, uploadSequentialDishImages } from "@/lib/data";

export default function NewDishPage() {
    const router = useRouter();
    const { rid, cid } = useParams<{ rid: string; cid: string }>();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [desc, setDesc] = useState("");
    const [descAr, setDescAr] = useState("");
    const [price, setPrice] = useState("");
    const [isActive, setIsActive] = useState(true);

    // Options
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

    async function handleCreate() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            // 1. Create the dish first to get its ID
            const dishData: any = {
                name: name.trim(),
                nameAr: nameAr.trim(),
                description: desc.trim(),
                descriptionAr: descAr.trim(),
                price: parseFloat(price) || 0,
                isActive,
                options: optHeader ? {
                    header: optHeader,
                    headerAr: optHeaderAr,
                    required: optRequired,
                    maxSelection: parseInt(optMax) || undefined,
                    items: optItems.filter(i => i.name.trim()).map(i => ({ ...i, price: parseFloat(i.price) || 0 }))
                } : undefined,
                allergens: allergens.filter(a => a.name.trim()).length > 0 ? allergens.filter(a => a.name.trim()) : undefined
            };

            const dishId = await createDish(rid, cid, dishData);

            // 2. Upload images using the dish ID for the correct storage path
            if (imageFiles.length > 0) {
                const results = await uploadSequentialDishImages(imageFiles, rid, cid, dishId, (idx, p) => {
                    const file = imageFiles[idx];
                    setUploadProgress(prev => ({ ...prev, [file.name]: p }));
                });
                const urls = results.map(r => r.url);
                const paths = results.map(r => r.path);
                await updateDish(rid, cid, dishId, { imageUrls: urls, imagePaths: paths } as any);
            }

            showToast("Dish created successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories/${cid}`), 1000);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to create dish", "error");
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

    return (
        <Page title="New Dish" actions={actions} leftAction={leftAction}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">New Dish</h2>

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
                            <input placeholder="Header (max 1 line)" className="w-full bg-transparent outline-none text-sm" value={optHeader} onChange={e => setOptHeader(e.target.value)} />
                        </div>
                        <div className="px-6 py-4 text-right">
                            <input placeholder="Header Arabic (optional)" className="w-full bg-transparent outline-none text-sm text-right" value={optHeaderAr} onChange={e => setOptHeaderAr(e.target.value)} dir="rtl" />
                        </div>
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span className="font-medium text-sm">Required Selection</span>
                            <button onClick={() => setOptRequired(!optRequired)} className={`w-10 h-5 rounded-full transition-colors relative ${optRequired ? 'bg-green-600' : 'bg-gray-300'}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${optRequired ? 'left-5.5' : 'left-0.5'}`} />
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <input placeholder="Max Selection (Optional)" type="number" className="w-full bg-transparent outline-none text-sm" value={optMax} onChange={e => setOptMax(e.target.value)} />
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                            {optItems.map((item, idx) => (
                                <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                                    <input placeholder="Name" className="flex-1 bg-transparent text-xs" value={item.name} onChange={e => {
                                        const newItems = [...optItems];
                                        newItems[idx].name = e.target.value;
                                        setOptItems(newItems);
                                    }} />
                                    <input placeholder="Price" className="w-16 bg-transparent text-xs" value={item.price} onChange={e => {
                                        const newItems = [...optItems];
                                        newItems[idx].price = e.target.value;
                                        setOptItems(newItems);
                                    }} />
                                </div>
                            ))}
                            <button
                                onClick={() => setOptItems([...optItems, { name: "", nameAr: "", price: "" }])}
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
                                <div key={idx} className="grid grid-cols-2 gap-2 bg-gray-50 p-2 rounded-xl">
                                    <input placeholder="English" className="bg-transparent text-xs" value={alg.name} onChange={e => {
                                        const newAllergens = [...allergens];
                                        newAllergens[idx].name = e.target.value;
                                        setAllergens(newAllergens);
                                    }} />
                                    <input placeholder="Arabic" className="bg-transparent text-xs text-right" dir="rtl" value={alg.nameAr} onChange={e => {
                                        const newAllergens = [...allergens];
                                        newAllergens[idx].nameAr = e.target.value;
                                        setAllergens(newAllergens);
                                    }} />
                                </div>
                            ))}
                            <button
                                onClick={() => setAllergens([...allergens, { name: "", nameAr: "" }])}
                                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center self-end hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </button>
                        </div>
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Images (optional)</label>
                    <p className="text-[11px] text-gray-400 px-4">Ideal: 2048 x 1536 px (4:3 ratio). Max 6 images, 10 MB each.</p>
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
                        <div className="flex flex-wrap gap-2 px-4 mb-2">
                            {imageFiles.map((file, idx) => (
                                <div key={idx} className="relative w-20 h-20 group">
                                    <img
                                        src={URL.createObjectURL(file)}
                                        alt="Preview"
                                        className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-100"
                                    />
                                    <button
                                        onClick={() => setImageFiles(prev => prev.filter((_, i) => i !== idx))}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 transition-colors"
                                    >
                                        ✕
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
                    <p className="text-xs text-gray-400 px-4 mt-2">{imageFiles.length}/6 selected</p>
                </section>

                <div className="h-20" />
            </div>
            {ToastComponent}
        </Page>
    );
}
