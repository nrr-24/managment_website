"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Page } from "@/components/ui/Page";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { FontPicker } from "@/components/ui/FontPicker";
import {
    getRestaurant,
    updateRestaurant,
    listCategories,
    Category,
    uploadRestaurantImage,
    deleteCategory,
    deleteRestaurant,
    deleteImageByPath,
    reorderCategories,
    ModifierGroup,
    listModifierGroups,
    deleteModifierGroup,
    migrateOptionsToModifiers
} from "@/lib/data";
import { useGlobalUI } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
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
import { StorageImage } from "@/components/ui/StorageImage";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { FormSection, FormCard, FormField, FormRow, formInputClass, formInputRtlClass } from "@/components/ui/FormSection";

function SortableCategoryCard({
    category,
    rid,
    canDelete,
    onDelete,
}: {
    category: Category;
    rid: string;
    canDelete: boolean;
    onDelete: (id: string, name: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" as const : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <Card className={`p-3 hover:bg-gray-50 transition-all rounded-2xl group border border-gray-100 ${isDragging ? "shadow-xl bg-white ring-2 ring-green-800/20" : ""}`}>
                <div className="flex items-center justify-between">
                    {/* Drag Handle */}
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-2 -ml-1 mr-1 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
                        aria-label="Drag to reorder"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                        </svg>
                    </button>

                    <Link href={`/admin/restaurants/${rid}/categories/${category.id}`} className="flex-1 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" /></svg>
                        </div>
                        <span className="font-bold text-blue-600">{category.name} {category.nameAr ? `(${category.nameAr})` : ''}</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        <Link href={`/admin/restaurants/${rid}/categories/${category.id}/edit`}>
                            <button aria-label={`Edit ${category.name}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                        </Link>
                        {canDelete && (
                            <button
                                onClick={() => onDelete(category.id, category.name)}
                                aria-label={`Delete ${category.name}`}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}

export default function RestaurantManagePage() {
    const { rid } = useParams<{ rid: string }>();
    const router = useRouter();
    const { toast, confirm } = useGlobalUI();
    const { canDelete, isAdmin } = useAuth();

    // Restaurant data
    const [name, setName] = useState("");
    const [nameAr, setNameAr] = useState("");
    const [themeColor, setThemeColor] = useState("#007aff");
    const [layout, setLayout] = useState("list");
    const [dishColumns, setDishColumns] = useState(2);
    const [cardImageOrientation, setCardImageOrientation] = useState<"landscape" | "portrait">("landscape");
    const [menuFont, setMenuFont] = useState("system");
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [logoPath, setLogoPath] = useState("");
    const [bgPath, setBgPath] = useState("");

    const [loaded, setLoaded] = useState(false);
    const [saving, setSaving] = useState(false);

    const [cats, setCats] = useState<Category[]>([]);
    const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
    const [activeTab, setActiveTab] = useState<"details" | "categories" | "modifiers">("details");
    const [migrating, setMigrating] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Dirty tracking for unsaved changes
    const initialDataRef = useRef<string>("");
    const currentData = JSON.stringify({ name, nameAr, themeColor, layout, dishColumns, cardImageOrientation, menuFont });
    useUnsavedChanges(loaded && currentData !== initialDataRef.current);

    // Local Previews
    const [logoPreview, setLogoPreview] = useState("");
    const [bgPreview, setBgPreview] = useState("");
    const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (logoFile) {
            const url = URL.createObjectURL(logoFile);
            setLogoPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setLogoPreview("");
        }
    }, [logoFile]);

    useEffect(() => {
        if (bgFile) {
            const url = URL.createObjectURL(bgFile);
            setBgPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setBgPreview("");
        }
    }, [bgFile]);

    async function refresh() {
        const r = await getRestaurant(rid);
        if (r) {
            setName(r.name || "");
            setNameAr(r.nameAr || "");
            setThemeColor(r.themeColorHex || "#007aff");
            setLayout(r.layout || "list");
            setDishColumns(r.dishColumns || 2);
            setCardImageOrientation(r.cardImageOrientation || "landscape");
            setMenuFont(r.menuFont || "system");
            setLogoPath(r.imagePath || "");
            setBgPath(r.backgroundImagePath || "");
            initialDataRef.current = JSON.stringify({
                name: r.name || "",
                nameAr: r.nameAr || "",
                themeColor: r.themeColorHex || "#007aff",
                layout: r.layout || "list",
                dishColumns: r.dishColumns || 2,
                cardImageOrientation: r.cardImageOrientation || "landscape",
                menuFont: r.menuFont || "system",
            });
        }
        setCats(await listCategories(rid));
        setModifiers(await listModifierGroups(rid));
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
    }, [rid]);

    async function handleSave() {
        if (!name.trim()) return;
        setSaving(true);
        try {
            const updates: any = {
                name: name.trim(),
                nameAr: nameAr.trim() || "",
                themeColorHex: themeColor,
                layout,
                dishColumns,
                cardImageOrientation,
                menuFont,
            };

            // Handle Logo Upload with timeout/error safety
            if (logoFile) {
                try {
                    const result = await uploadRestaurantImage(logoFile, rid, "logo", (p) => {
                        setUploadProgress(prev => ({ ...prev, logo: p }));
                    });
                    updates.imagePath = result.path;
                } catch (err) {
                    console.error("Logo upload failed:", err);
                    toast("Logo upload failed, but settings will still save", "error");
                }
            }

            // Handle Background Upload with timeout/error safety
            if (bgFile) {
                try {
                    const result = await uploadRestaurantImage(bgFile, rid, "background", (p) => {
                        setUploadProgress(prev => ({ ...prev, background: p }));
                    });
                    updates.backgroundImagePath = result.path;
                } catch (err) {
                    console.error("Background upload failed:", err);
                    toast("Background upload failed, but settings will still save", "error");
                }
            }

            await updateRestaurant(rid, updates);

            // Clear files after successful upload
            setLogoFile(null);
            setBgFile(null);

            await refresh();
            toast("Settings saved successfully!");
        } catch (err) {
            console.error("Save failed:", err);
            toast("Failed to save changes. Please check your connection.", "error");
        } finally {
            setSaving(false);
            setUploadProgress({});
        }
    }

    async function handleDeleteCategory(id: string, catName: string) {
        const ok = await confirm({ title: "Delete Category", message: `Delete category "${catName}" and all its dishes?`, destructive: true });
        if (!ok) return;
        try {
            await deleteCategory(rid, id);
            toast("Category deleted");
            await refresh();
        } catch {
            toast("Failed to delete category", "error");
        }
    }

    async function handleCategoryDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = cats.findIndex(c => c.id === active.id);
        const newIndex = cats.findIndex(c => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        // Optimistic update
        const newCats = arrayMove(cats, oldIndex, newIndex);
        setCats(newCats);

        // Persist to Firestore
        try {
            await reorderCategories(rid, newCats.map((c: Category) => c.id));
        } catch {
            toast("Failed to save order", "error");
            await refresh(); // Revert on failure
        }
    }

    const [deleting, setDeleting] = useState(false);

    async function handleDeleteRestaurant() {
        const ok = await confirm({ title: "Delete Restaurant", message: `Delete "${name}" and all its categories, dishes, and images? This cannot be undone.`, destructive: true });
        if (!ok) return;
        setDeleting(true);
        try {
            await deleteRestaurant(rid);
            toast("Restaurant deleted");
            setTimeout(() => router.push('/admin/restaurants'), 1000);
        } catch (err) {
            console.error("Delete restaurant failed:", err);
            toast("Failed to delete restaurant", "error");
            setDeleting(false);
        }
    }

    async function handleRemoveLogo() {
        if (logoPath) {
            await deleteImageByPath(logoPath);
        }
        setLogoPath("");
        setLogoFile(null);
        setLogoPreview("");
        await updateRestaurant(rid, { imagePath: "" });
        toast("Logo removed");
    }

    async function handleRemoveBg() {
        if (bgPath) {
            await deleteImageByPath(bgPath);
        }
        setBgPath("");
        setBgFile(null);
        setBgPreview("");
        await updateRestaurant(rid, { backgroundImagePath: "" });
        toast("Background removed");
    }

    const actions = (
        <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="text-green-800 font-bold hover:opacity-70 disabled:opacity-30 transition-opacity"
        >
            {saving ? "..." : "Save"}
        </button>
    );

    if (!loaded) return (
        <Page title="Loading..." backPath="/" breadcrumbs={[{label: "Restaurants", href: "/admin/restaurants"}, {label: "Loading..."}]}>
            <FormSkeleton />
        </Page>
    );

    return (
        <Page title={name || rid} actions={actions} backPath="/" breadcrumbs={[{label: "Restaurants", href: "/admin/restaurants"}, {label: name || "Restaurant"}]}>
            <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold px-1 mb-1">{name || "Restaurant"}</h2>
                <p className="text-sm text-gray-400 px-1 mb-6">Manage your restaurant profile, menu appearance, and items.</p>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-8 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                            activeTab === "details" ? "border-green-800 text-green-800" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab("categories")}
                        className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                            activeTab === "categories" ? "border-green-800 text-green-800" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Categories
                    </button>
                    <button
                        onClick={() => setActiveTab("modifiers")}
                        className={`px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors border-b-2 ${
                            activeTab === "modifiers" ? "border-green-800 text-green-800" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                    >
                        Modifiers
                    </button>
                </div>

                {activeTab === "details" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── Section 1: Restaurant Info ── */}
                <FormSection title="Restaurant Info" description="The name your customers will see on the menu page.">
                    <FormCard>
                        <FormField label="Name (English)" required>
                            <input
                                className={formInputClass}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Luma Restaurant"
                            />
                        </FormField>
                        <FormField label="Name (Arabic)" hint="Shown when the customer switches to Arabic.">
                            <input
                                className={formInputRtlClass}
                                value={nameAr}
                                onChange={(e) => setNameAr(e.target.value)}
                                placeholder="الاسم بالعربي"
                                dir="rtl"
                            />
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* ── Section 2: Menu Appearance ── */}
                <FormSection title="Menu Appearance" description="Customize how your public menu looks to customers.">
                    <FormCard>
                        <FormRow label="Theme Color" hint="Accent color used on category tabs and dish prices.">
                            <ColorPicker value={themeColor} onChange={setThemeColor} />
                        </FormRow>
                    </FormCard>

                    <div className="mt-3">
                        <FormCard>
                            <FormField label="Menu Layout" hint="Classic Scroll shows all categories on one page. Category Grid shows one category at a time.">
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    {[
                                        { value: "list", label: "Classic Scroll" },
                                        { value: "grid", label: "Category Grid" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setLayout(opt.value)}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-all no-min-tap ${
                                                layout === opt.value
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                            <FormField label="Dish Columns" hint="Number of columns in the dish grid on the public menu.">
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    {[1, 2, 3, 4].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => setDishColumns(n)}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all no-min-tap ${
                                                dishColumns === n
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                            <FormField label="Card Image Shape" hint="Landscape (3:2) for wide images. Portrait (2:3) for tall images like drinks and juices.">
                                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                                    {([
                                        { value: "landscape" as const, label: "Landscape", icon: (
                                            <svg className="w-5 h-3.5 mr-1.5" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="1" width="18" height="12" rx="2" />
                                            </svg>
                                        )},
                                        { value: "portrait" as const, label: "Portrait", icon: (
                                            <svg className="w-3.5 h-5 mr-1.5" viewBox="0 0 14 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="1" y="1" width="12" height="18" rx="2" />
                                            </svg>
                                        )},
                                    ]).map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setCardImageOrientation(opt.value)}
                                            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all no-min-tap flex items-center justify-center ${
                                                cardImageOrientation === opt.value
                                                    ? "bg-white text-gray-900 shadow-sm"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {opt.icon}
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                            <FormField label="Menu Font" hint="Typography style for your customer-facing menu.">
                                <FontPicker value={menuFont} onChange={setMenuFont} />
                            </FormField>
                        </FormCard>
                    </div>
                </FormSection>

                {/* ── Section 3: Images ── */}
                <FormSection title="Images" description="Upload a logo and background for your menu's header area.">
                    {/* Logo */}
                    <div className="mb-4">
                        <p className="text-[13px] font-medium text-gray-500 px-1 mb-2">Logo</p>
                        <FormCard className="!divide-y-0">
                            <div className="p-6 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-green-50 text-green-800 rounded-2xl flex items-center justify-center mb-3 overflow-hidden">
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewLightbox(logoPreview)} />
                                    ) : logoPath ? (
                                        <StorageImage path={logoPath} alt="" className="w-full h-full object-cover" lightbox />
                                    ) : (
                                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                                    )}
                                </div>
                                <p className="text-[12px] text-gray-400 mb-3">Square image, 1024x1024px recommended. Max 10 MB.</p>
                                {uploadProgress.logo !== undefined && (
                                    <div className="w-full max-w-[200px] mb-3">
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-800 transition-all duration-300"
                                                style={{ width: `${uploadProgress.logo}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] font-bold text-green-800 mt-1 uppercase tracking-wider">Uploading {Math.round(uploadProgress.logo)}%</p>
                                    </div>
                                )}
                                <div className="flex items-center gap-3">
                                    <label className="px-4 py-2 bg-green-50 text-green-800 text-sm font-bold rounded-full cursor-pointer hover:bg-green-100 transition-colors">
                                        {(logoPreview || logoPath) ? "Change" : "Upload Logo"}
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
                                    </label>
                                    {(logoPreview || logoPath || logoFile) && (
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="px-4 py-2 text-red-500 text-sm font-bold rounded-full hover:bg-red-50 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        </FormCard>
                    </div>

                    {/* Background */}
                    <div>
                        <p className="text-[13px] font-medium text-gray-500 px-1 mb-2">Background Image</p>
                        <div className="bg-white rounded-2xl border border-gray-200/60 h-40 flex items-center justify-center overflow-hidden relative">
                            {bgPreview ? (
                                <>
                                    <img src={bgPreview} alt="" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setPreviewLightbox(bgPreview)} />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                        <label className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors cursor-pointer" aria-label="Change background">
                                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                        </label>
                                        <button
                                            onClick={handleRemoveBg}
                                            aria-label="Remove background image"
                                            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </>
                            ) : bgPath ? (
                                <>
                                    <StorageImage path={bgPath} alt="" className="w-full h-full object-cover" lightbox />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                        <label className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors cursor-pointer" aria-label="Change background">
                                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                        </label>
                                        <button
                                            onClick={handleRemoveBg}
                                            aria-label="Remove background image"
                                            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                                    <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                                    <span className="text-sm font-semibold text-gray-400 mt-2">Upload Background</span>
                                    <span className="text-[11px] text-gray-300 mt-1">2048x2048 or 1920x1080 recommended</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setBgFile(e.target.files?.[0] ?? null)} />
                                </label>
                            )}
                            {uploadProgress.background !== undefined && (
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-black/50 backdrop-blur-sm">
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white transition-all duration-300"
                                            style={{ width: `${uploadProgress.background}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-white mt-1 uppercase tracking-wider">Uploading {Math.round(uploadProgress.background)}%</p>
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>
                </div>
                )}

                {activeTab === "categories" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* ── Section 4: Categories ── */}
                <FormSection title="Categories" description="Organize your menu into categories. Each category contains dishes.">
                    <div className="space-y-2">
                        {cats.length === 0 ? (
                            <FormCard className="!divide-y-0">
                                <div className="p-8 text-center">
                                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-7 h-7 text-green-300" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                                        </svg>
                                    </div>
                                    <p className="font-semibold text-gray-900 mb-1">No categories yet</p>
                                    <p className="text-sm text-gray-400 mb-4">Add your first menu category to get started</p>
                                    <Link href={`/admin/restaurants/${rid}/categories/new`}>
                                        <button className="px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-full hover:bg-green-900 active:scale-[0.97] transition-all">
                                            + Add Category
                                        </button>
                                    </Link>
                                </div>
                            </FormCard>
                        ) : (
                            <>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleCategoryDragEnd}
                                >
                                    <SortableContext
                                        items={cats.map(c => c.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {cats.map((c) => (
                                            <SortableCategoryCard
                                                key={c.id}
                                                category={c}
                                                rid={rid}
                                                canDelete={canDelete}
                                                onDelete={handleDeleteCategory}
                                            />
                                        ))}
                                    </SortableContext>
                                </DndContext>
                                <Link href={`/admin/restaurants/${rid}/categories/new`}>
                                    <button className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm font-semibold text-gray-400 hover:border-green-800 hover:text-green-800 transition-colors mt-2">
                                        + Add Category
                                    </button>
                                </Link>
                            </>
                        )}
                    </div>
                </FormSection>
                </div>
                )}

                {activeTab === "modifiers" && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <FormSection 
                            title="Modifiers" 
                            description="Create add-ons and modifiers that you can attach to multiple dishes."
                        >
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={async () => {
                                        if (await confirm({ title: "Migrate Options", message: "Are you sure you want to migrate existing Custom Options into Centralized Modifiers? This might take a few moments." })) {
                                            setMigrating(true);
                                            try {
                                                const count = await migrateOptionsToModifiers(rid);
                                                toast(`Migration complete! Successfully linked ${count} dishes to centralized modifiers.`);
                                                refresh();
                                            } catch (err) {
                                                console.error(err);
                                                toast("Failed to migrate options", "error");
                                            } finally {
                                                setMigrating(false);
                                            }
                                        }
                                    }}
                                    disabled={migrating}
                                    className="px-4 py-2 bg-purple-50 text-purple-700 text-sm font-semibold rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50"
                                >
                                    {migrating ? "Migrating..." : "Migrate Old Options"}
                                </button>
                            </div>
                            
                            {modifiers.length === 0 ? (
                                <FormCard className="!divide-y-0">
                                    <div className="p-8 text-center bg-gray-50/50 rounded-2xl">
                                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-gray-900 mb-1">No Modifiers Yet</p>
                                        <p className="text-sm text-gray-500 mb-4">Create your first modifier group.</p>
                                        <Link href={`/admin/restaurants/${rid}/modifiers/new`}>
                                            <button className="px-5 py-2.5 bg-green-800 text-white font-bold rounded-full hover:opacity-90 transition-opacity">
                                                + Add Modifier Group
                                            </button>
                                        </Link>
                                    </div>
                                </FormCard>
                            ) : (
                                <>
                                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                                        <div className="grid grid-cols-[1fr_2fr_100px_80px] gap-4 px-6 py-3 bg-gray-50/80 border-b border-gray-100 items-center">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Group Name</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Modifiers</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Items</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {modifiers.map((mod) => (
                                                <div key={mod.id} className="grid grid-cols-[1fr_2fr_100px_80px] gap-4 px-6 py-4 items-center group hover:bg-gray-50/50 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
                                                        {mod.nameAr && <p className="text-[11px] text-gray-400" dir="rtl">{mod.nameAr}</p>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600 truncate">
                                                            {mod.items?.map((i: any) => i.name).join(", ") || "No Modifiers"}
                                                        </p>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="inline-flex px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-[11px] font-bold">
                                                            {mod.items?.length || 0} items
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link href={`/admin/restaurants/${rid}/modifiers/${mod.id}/edit`}>
                                                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-green-800 hover:bg-green-50 transition-all">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                            </button>
                                                        </Link>
                                                        <button 
                                                            onClick={async () => {
                                                                if (await confirm({ title: "Delete Modifier", message: `Delete "${mod.name}"? This will remove it from all dishes that use it.`, destructive: true })) {
                                                                    await deleteModifierGroup(rid, mod.id);
                                                                    refresh();
                                                                    toast("Modifier deleted", "success");
                                                                }
                                                            }}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <Link href={`/admin/restaurants/${rid}/modifiers/new`}>
                                        <button className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3 text-center text-sm font-semibold text-gray-400 hover:border-green-800 hover:text-green-800 transition-colors">
                                            + Add Modifier Group
                                        </button>
                                    </Link>
                                </>
                            )}
                        </FormSection>
                    </div>
                )}

                {/* ── Section 5: Danger Zone ── */}
                {activeTab === "details" && isAdmin && canDelete && (
                    <FormSection title="Danger Zone" description="Irreversible actions. Please be careful.">
                        <div className="bg-red-50/50 rounded-2xl border border-red-100 overflow-hidden">
                            <button
                                onClick={handleDeleteRestaurant}
                                disabled={deleting}
                                aria-label="Delete restaurant"
                                className="w-full px-5 py-4 flex items-center gap-3 text-red-500 hover:bg-red-50 transition-colors font-bold disabled:opacity-50"
                            >
                                {deleting ? (
                                    <div className="w-5 h-5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                                <div className="text-left">
                                    <span className="block">{deleting ? "Deleting..." : "Delete Restaurant"}</span>
                                    <span className="text-[12px] font-normal text-red-400">Remove this restaurant and all its data permanently.</span>
                                </div>
                            </button>
                        </div>
                    </FormSection>
                )}

                <div className="h-20" />
            </div>

            {previewLightbox && (
                <ImageLightbox src={previewLightbox} alt="Preview" onClose={() => setPreviewLightbox(null)} />
            )}
        </Page>
    );
}
