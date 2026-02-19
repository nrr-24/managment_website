"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createCategory } from "@/lib/data";

export default function NewCategoryPage() {
    const router = useRouter();
    const { rid } = useParams<{ rid: string }>();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [limitAvailability, setLimitAvailability] = useState(false);
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [progress, setProgress] = useState<number | null>(null);

    // Icon handling
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setIconFile(file);
            setIconPreview(URL.createObjectURL(file));
        }
    }

    async function handleCreate() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const { uploadCategoryImage, updateCategory } = await import("@/lib/data");

            const categoryId = await createCategory(rid, {
                name: name.trim(),
                nameAr: nameAr.trim(),
                isActive,
                availabilityStart: limitAvailability ? startTime : undefined,
                availabilityEnd: limitAvailability ? endTime : undefined,
            } as any);

            if (iconFile) {
                const { url, path } = await uploadCategoryImage(iconFile, rid, categoryId, (p) => {
                    setProgress(p);
                });
                await updateCategory(rid, categoryId, { imageUrl: url, imagePath: path });
            }

            showToast("Category created successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}/categories`), 1000);
        } catch (err: any) {
            console.error(err);
            showToast(err.message || "Failed to create category", "error");
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
        <Page title="New Category" actions={actions} leftAction={leftAction}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">New Category</h2>

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
                    <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Icon (optional)</label>
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
                            {iconPreview ? (
                                <img src={iconPreview} alt="Icon preview" className="w-10 h-10 object-cover rounded-xl shadow-sm" />
                            ) : (
                                <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                            )}
                            <span className="text-green-800 font-bold">
                                {iconFile ? "Change icon" : "Select icon"}
                            </span>
                            {progress !== null && (
                                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider block">
                                    Uploading {Math.round(progress)}%
                                </span>
                            )}
                        </div>
                        {iconFile && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIconFile(null); setIconPreview(null); }}
                                className="text-red-500 text-sm font-bold pr-2"
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
                    <p className="text-xs text-gray-400 px-4 mt-2">
                        {limitAvailability
                            ? `Category will be visible from ${startTime} to ${endTime}.`
                            : "Category is always visible (unless inactive)."}
                    </p>
                </section>

                <div className="h-20" />
            </div>
            {ToastComponent}
        </Page>
    );
}
