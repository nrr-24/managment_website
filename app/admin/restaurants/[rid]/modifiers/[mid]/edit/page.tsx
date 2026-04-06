"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getModifierGroup, updateModifierGroup, getRestaurant } from "@/lib/data";
import { FormSection, FormCard, FormField, formInputClass, formInputRtlClass } from "@/components/ui/FormSection";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";

// Define it at the top level
const noSpinClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function SortableModifierItem({
    item,
    idx,
    updateItem,
    removeItem,
}: {
    item: { id: string; name: string; nameAr: string; price: string; isActive: boolean };
    idx: number;
    updateItem: (idx: number, updates: Partial<typeof item>) => void;
    removeItem: (idx: number) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className={`p-4 bg-white border border-gray-100 rounded-2xl mb-3 flex flex-wrap md:flex-nowrap items-center gap-4 transition-shadow transition-colors group ${isDragging ? "shadow-xl ring-2 ring-purple-500/20 z-50" : "hover:border-gray-200"}`}>
            <button
                {...attributes}
                {...listeners}
                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 shrink-0"
                aria-label="Drag to reorder"
            >
                <svg className="w-5 h-5 -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9h8M8 15h8" /></svg>
            </button>
            <div className="flex-1 min-w-0 min-w-[200px]">
                <input
                    placeholder="Name"
                    className="w-full text-sm font-semibold text-gray-900 bg-transparent outline-none placeholder:text-gray-300 mb-1"
                    value={item.name}
                    onChange={e => updateItem(idx, { name: e.target.value })}
                />
                <input
                    placeholder="الاسم"
                    className="w-full text-[11px] text-gray-400 bg-transparent outline-none text-right placeholder:text-gray-200"
                    dir="rtl"
                    value={item.nameAr}
                    onChange={e => updateItem(idx, { nameAr: e.target.value })}
                />
            </div>
            <div className="flex gap-4 items-center shrink-0 w-full md:w-auto">
                <div className="flex-1 items-center flex gap-3 bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100/50">
                    <span className="text-xs font-semibold text-gray-500">KD</span>
                    <input
                        placeholder="0.00"
                        type="number"
                        step="0.001"
                        className={`w-full md:w-16 text-sm font-medium text-right bg-transparent outline-none text-gray-800 ${noSpinClass}`}
                        value={item.price}
                        onChange={e => updateItem(idx, { price: e.target.value })}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => updateItem(idx, { isActive: !item.isActive })}
                        role="switch"
                        aria-checked={item.isActive}
                        className={`w-12 h-7 rounded-full transition-colors relative ${item.isActive ? 'bg-purple-600' : 'bg-gray-200'}`}
                    >
                        <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-all ${item.isActive ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                </div>
                <button
                    onClick={() => removeItem(idx)}
                    aria-label="Remove item"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all no-min-tap"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        </div>
    );
}

export default function EditModifierPage() {
    const router = useRouter();
    const { rid, mid } = useParams<{ rid: string, mid: string }>();
    const { toast } = useGlobalUI();

    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [isRequired, setIsRequired] = useState(false);
    const [minSelection, setMinSelection] = useState("0");
    const [maxSelection, setMaxSelection] = useState("0");
    
    const [items, setItems] = useState<{ id: string; name: string; nameAr: string; price: string; isActive: boolean }[]>([]);

    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");

    const initialDataRef = useRef("");
    const currentData = JSON.stringify({ name, nameAr, isRequired, minSelection, maxSelection, items });
    useUnsavedChanges(loaded && currentData !== initialDataRef.current);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        getRestaurant(rid).then(r => {
            if (r) setRestaurantName(r.name || "");
        });
        getModifierGroup(rid, mid).then(m => {
            if (m) {
                setName(m.name || "");
                setNameAr(m.nameAr || "");
                setIsRequired(!!m.required);
                setMinSelection(m.minSelection?.toString() || "");
                setMaxSelection(m.maxSelection?.toString() || "");
                setItems(m.items?.map(i => ({
                    id: i.id || crypto.randomUUID(),
                    name: i.name || "",
                    nameAr: i.nameAr || "",
                    price: i.price?.toString() || "",
                    isActive: i.isActive ?? true
                })) || []);
                initialDataRef.current = JSON.stringify({ 
                    name: m.name || "", 
                    nameAr: m.nameAr || "", 
                    isRequired: !!m.required, 
                    minSelection: m.minSelection?.toString() || "", 
                    maxSelection: m.maxSelection?.toString() || "", 
                    items: m.items?.map(i => ({ 
                        id: i.id || crypto.randomUUID(), 
                        name: i.name || "", 
                        nameAr: i.nameAr || "", 
                        price: i.price?.toString() || "",
                        isActive: i.isActive ?? true
                    })) || []
                });
            }
            setLoaded(true);
        });
    }, [rid, mid]);

    async function handleSave() {
        if (!name.trim()) {
            toast("Group Name is required", "error");
            return;
        }
        setBusy(true);
        try {
            await updateModifierGroup(rid, mid, {
                name: name.trim(),
                nameAr: nameAr.trim(),
                required: isRequired,
                minSelection: minSelection ? parseInt(minSelection) : undefined,
                maxSelection: maxSelection ? parseInt(maxSelection) : undefined,
                items: items.filter(i => i.name.trim()).map(i => ({
                    ...i,
                    price: parseFloat(i.price) || 0
                }))
            });

            toast("Modifier Group updated successfully!");
            setTimeout(() => router.push(`/admin/restaurants/${rid}?tab=modifiers`), 1000);
        } catch (err: any) {
            console.error(err);
            toast(err.message || "Failed to update modifier", "error");
            setBusy(false);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        setItems(arrayMove(items, oldIndex, newIndex));
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
        { label: "Modifiers", href: `/admin/restaurants/${rid}?tab=modifiers` },
        { label: name || "Edit" },
    ];

    if (!loaded) return <Page title="Loading..." breadcrumbs={breadcrumbs}><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;

    return (
        <Page title="Edit Modifier Group" actions={actions} leftAction={leftAction} breadcrumbs={breadcrumbs}>
            <div className="space-y-6 max-w-2xl mx-auto px-4 md:px-0">
                <h2 className="text-3xl font-bold px-4">Edit Modifier Group</h2>

                <FormSection title="Group Info" description="The overarching name for this group of modifiers (e.g., 'Meat Selection').">
                    <FormCard>
                        <FormField label="Group Name (English)" required>
                            <input
                                placeholder="e.g. Wagyu Striploin Steak (300g)"
                                className={formInputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Group Name (Arabic)">
                            <input
                                placeholder="مثال: اختر الحجم"
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                dir="rtl"
                            />
                        </FormField>
                        
                        <div className="flex flex-wrap items-center gap-6 px-4 py-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setIsRequired(!isRequired)}
                                    role="switch"
                                    aria-checked={isRequired}
                                    className={`w-10 h-6 rounded-full transition-colors relative ${isRequired ? 'bg-purple-600' : 'bg-gray-200'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isRequired ? 'left-[18px]' : 'left-0.5'}`} />
                                </button>
                                <span className="text-sm font-medium text-gray-700">Required Selection</span>
                            </div>
                            <div className="flex items-center gap-6 ml-auto">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Min Choices</span>
                                    <input
                                        placeholder="0"
                                        type="number"
                                        className={`${formInputClass} !w-16 text-center ${noSpinClass}`}
                                        value={minSelection}
                                        onChange={e => setMinSelection(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Max Choices</span>
                                    <input
                                        placeholder="0"
                                        type="number"
                                        max={items.length > 0 ? items.length : undefined}
                                        className={`${formInputClass} !w-16 text-center ${noSpinClass}`}
                                        value={maxSelection}
                                        onChange={e => {
                                            if (e.target.value === "") {
                                                setMaxSelection("");
                                                return;
                                            }
                                            const num = parseInt(e.target.value);
                                            if (!isNaN(num)) {
                                                if (items.length > 0 && num > items.length) {
                                                    setMaxSelection(items.length.toString());
                                                } else {
                                                    setMaxSelection(num.toString());
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </FormCard>
                </FormSection>

                <FormSection title="Modifiers" description="The specific add-ons or options underneath this group.">
                    <div className="bg-gray-50/50 rounded-3xl p-4 md:p-6 border border-dashed border-gray-200">
                        {items.length > 0 && (
                            <div className="hidden md:flex gap-4 px-4 pb-2 pt-1 uppercase tracking-wider text-[11px] font-bold text-gray-400">
                                <span className="w-6 shrink-0"></span>
                                <span className="flex-1">Name</span>
                                <span className="w-[104px] shrink-0 text-center">Price</span>
                                <span className="w-12 shrink-0"></span>
                                <span className="w-8 shrink-0"></span>
                            </div>
                        )}
                        <DndContext 
                            sensors={sensors} 
                            collisionDetection={closestCenter} 
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
                        >
                            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                                {items.map((item, idx) => (
                                    <SortableModifierItem
                                        key={item.id}
                                        item={item}
                                        idx={idx}
                                        updateItem={(i, upd) => {
                                            const newItems = [...items];
                                            newItems[i] = { ...newItems[i], ...upd };
                                            setItems(newItems);
                                        }}
                                        removeItem={i => setItems(items.filter((_, index) => index !== i))}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>

                        <button
                            onClick={() => setItems([...items, { id: crypto.randomUUID(), name: "", nameAr: "", price: "", isActive: true }])}
                            className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm font-semibold text-gray-400 hover:border-green-800 hover:text-green-800 transition-colors mt-2"
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
