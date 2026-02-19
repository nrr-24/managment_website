"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { StorageImage } from "@/components/ui/StorageImage";
import { useToast } from "@/components/ui/Toast";
import { getCategory, updateCategory, uploadCategoryImage, deleteImageByPath, Category } from "@/lib/data";

export default function EditCategoryPage() {
    const router = useRouter();
    const { rid, cid } = useParams<{ rid: string; cid: string }>();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [iconUrl, setIconUrl] = useState<string | null>(null);
    const [iconPath, setIconPath] = useState<string | null>(null);
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);
    const [limitAvailability, setLimitAvailability] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
        getCategory(rid, cid).then(cat => {
            if (cat) {
                setName(cat.name || "");
                setNameAr(cat.nameAr || "");
                setIsActive(cat.isActive !== false);
                setIconUrl(cat.imageUrl || null);
                setIconPath(cat.imagePath || null);
                if (cat.availabilityStart) {
                    setLimitAvailability(true);
                    setStartTime(cat.availabilityStart);
                    setEndTime(cat.availabilityEnd || "17:00");
                }
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
            setIconUrl(null);
            setIconPath(null);
            setIconFile(null);
            setIconPreview(null);
            await updateCategory(rid, cid, { imageUrl: "", imagePath: "" } as any);
            showToast("Icon removed");
        } catch (err) {
            console.error("Failed to remove icon:", err);
            showToast("Failed to remove icon", "error");
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
                    updates.imageUrl = url;
                    updates.imagePath = path;
                    setIconUrl(url);
                } catch (err) {
                    console.error("Category icon upload failed:", err);
                    showToast("Icon upload failed, but name will be updated", "error");
                }
            }

            await updateCategory(rid, cid, updates);

            // Clear file after success
            setIconFile(null);
            setIconPreview(null);

            showToast("Category updated successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories`), 1000);
        } catch (err) {
            console.error("Save category failed:", err);
            showToast("Failed to update category. Please check your connection.", "error");
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

    if (!loaded) return <Page title="Loading..."><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;

    return (
        <Page title="Edit Category" actions={actions} leftAction={leftAction} backPath={`/admin/restaurants/${rid}/categories`}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">Edit Category</h2>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Category info</label>
                    <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-3xl">
                        <div className="px-6 py-4">
                            <input
                                placeholder="Name (English)"
                                className="w-full bg-transparent outline-none text-lg"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="px-6 py-4">
                            <input
                                placeholder="Name (Arabic)"
                                className="w-full bg-transparent outline-none text-lg text-right"
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                dir="rtl"
                            />
                        </div>
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span className="font-bold">Active</span>
                            <button
                                onClick={() => setIsActive(!isActive)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Icon</label>
                    <p className="text-[11px] text-gray-400 px-4">Ideal: 1384 x 820 px (~1.69:1 ratio). Max 10 MB.</p>
                    <input
                        type="file"
                        id="icon-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <Card
                        onClick={() => document.getElementById('icon-upload')?.click()}
                        className="p-4 flex items-center justify-between rounded-3xl cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-50 text-green-700 rounded-xl flex items-center justify-center overflow-hidden">
                                {iconPreview ? (
                                    <img src={iconPreview} alt="" className="w-full h-full object-cover" />
                                ) : (iconPath || iconUrl) ? (
                                    <StorageImage path={(iconPath || iconUrl) ?? undefined} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-green-800 font-bold">
                                    {iconUrl || iconFile ? "Change icon" : "Select icon"}
                                </span>
                                {progress !== null && (
                                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">
                                        Uploading {Math.round(progress)}%
                                    </span>
                                )}
                            </div>
                        </div>
                        {(iconUrl || iconPath || iconFile) && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveIcon(); }}
                                className="text-red-500 text-sm font-bold pr-2 hover:underline"
                            >
                                Remove
                            </button>
                        )}
                    </Card>
                </section>

                <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Availability</label>
                    <Card className="p-0 overflow-hidden divide-y divide-gray-100 rounded-3xl">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <span className="font-bold">Limit availability</span>
                            <button
                                onClick={() => setLimitAvailability(!limitAvailability)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${limitAvailability ? 'bg-green-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${limitAvailability ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                        {limitAvailability && (
                            <>
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <span className="font-bold">Start Time</span>
                                    <input
                                        type="time"
                                        className="bg-gray-100 px-3 py-1 rounded-lg outline-none font-bold"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="px-6 py-4 flex items-center justify-between">
                                    <span className="font-bold">End Time</span>
                                    <input
                                        type="time"
                                        className="bg-gray-100 px-3 py-1 rounded-lg outline-none font-bold"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </Card>
                </section>

                <div className="h-20" />
            </div>
            {ToastComponent}
        </Page>
    );
}
