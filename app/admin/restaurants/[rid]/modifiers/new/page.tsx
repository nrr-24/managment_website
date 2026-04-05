"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { createModifierGroup, getRestaurant } from "@/lib/data";
import { FormSection, FormCard, FormField, formInputClass, formInputRtlClass } from "@/components/ui/FormSection";

export default function NewModifierPage() {
    const router = useRouter();
    const { rid } = useParams<{ rid: string }>();
    const { toast } = useGlobalUI();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [maxSelection, setMaxSelection] = useState("");

    const [items, setItems] = useState<{ id?: string; name: string; nameAr: string; price: string }[]>([]);

    const [busy, setBusy] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");

    useUnsavedChanges(name.trim().length > 0 || items.length > 0);

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
    }, [rid]);

    async function handleCreate() {
        if (!name.trim()) {
            toast("Group Name is required", "error");
            return;
        }
        setBusy(true);
        try {
            await createModifierGroup(rid, {
                name: name.trim(),
                nameAr: nameAr.trim(),
                required: isRequired,
                maxSelection: parseInt(maxSelection) || undefined,
                items: items.filter(i => i.name.trim()).map(i => ({
                    ...i,
                    price: parseFloat(i.price) || 0
                }))
            });

            toast("Modifier Group created successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}?tab=modifiers`), 1000);
        } catch (err: any) {
            console.error(err);
            toast(err.message || "Failed to create modifier", "error");
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
        { label: "Modifiers", href: `/admin/restaurants/${rid}?tab=modifiers` },
        { label: "New" },
    ];

    return (
        <Page title="New Modifier Group" actions={actions} leftAction={leftAction} breadcrumbs={breadcrumbs}>
            <div className="space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-4">New Modifier Group</h2>

                {/* Section 1 — Info */}
                <FormSection title="Group Info" description="The overarching name for this group of modifiers (e.g., 'Meat Selection').">
                    <FormCard>
                        <FormField label="Group Name (English)" required>
                            <input
                                placeholder="e.g. Choose your size"
                                className={formInputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Group Name (Arabic)">
                            <input
                                placeholder="e.g. اختر الحجم"
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>

                        <div className="flex items-center gap-6 mt-4 px-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsRequired(!isRequired)}
                                    role="switch"
                                    aria-checked={isRequired}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${isRequired ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isRequired ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                                <span className="text-sm font-medium text-gray-700">Required Selection</span>
                            </div>
                            <div className="flex items-center gap-3 ml-auto">
                                <span className="text-sm font-medium text-gray-700">Max Choices</span>
                                <input
                                    placeholder="∞"
                                    type="number"
                                    className={`${formInputClass} !w-16 text-center`}
                                    value={maxSelection}
                                    onChange={e => setMaxSelection(e.target.value)}
                                />
                            </div>
                        </div>
                    </FormCard>
                </FormSection>

                {/* Section 2 — Items */}
                <FormSection title="Modifier Items" description="The specific add-ons or options underneath this group.">
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {items.length > 0 && (
                            <div className="border-b border-gray-100">
                                <div className="grid grid-cols-[1fr_1fr_80px_36px] gap-0 px-4 py-2 bg-gray-50/80">
                                    <span className="text-[11px] font-medium text-gray-400">Name</span>
                                    <span className="text-[11px] font-medium text-gray-400 text-right" dir="rtl">Arabic</span>
                                    <span className="text-[11px] font-medium text-gray-400 text-center">Price</span>
                                    <span />
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="grid grid-cols-[1fr_1fr_80px_36px] gap-0 items-center group hover:bg-gray-50/50 transition-colors">
                                            <input
                                                placeholder="Name"
                                                className="w-full px-4 py-2.5 text-sm bg-transparent outline-none placeholder:text-gray-300"
                                                value={item.name}
                                                onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[idx].name = e.target.value;
                                                    setItems(newItems);
                                                }}
                                            />
                                            <input
                                                placeholder="الاسم"
                                                className="w-full px-4 py-2.5 text-sm bg-transparent outline-none text-right placeholder:text-gray-300"
                                                dir="rtl"
                                                value={item.nameAr}
                                                onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[idx].nameAr = e.target.value;
                                                    setItems(newItems);
                                                }}
                                            />
                                            <input
                                                placeholder="0.000"
                                                type="number"
                                                step="0.001"
                                                className="w-full px-2 py-2.5 text-sm bg-transparent outline-none text-center placeholder:text-gray-300"
                                                value={item.price}
                                                onChange={e => {
                                                    const newItems = [...items];
                                                    newItems[idx].price = e.target.value;
                                                    setItems(newItems);
                                                }}
                                            />
                                            <button
                                                onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                aria-label="Remove item"
                                                className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all mx-auto no-min-tap"
                                            >
                                                <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setItems([...items, { name: "", nameAr: "", price: "" }])}
                            className="w-full py-4 text-center text-sm font-bold text-green-800 hover:bg-green-50 transition-colors"
                        >
                            + Add Modifier Item
                        </button>
                    </div>
                </FormSection>

                <div className="h-20" />
            </div>
        </Page>
    );
}
