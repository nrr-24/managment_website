"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { getUser, updateUser, deleteUser, uploadUserBackgroundImage, deleteImageByPath, listRestaurants, User, Restaurant } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { FormSection, FormCard, FormField, FormRow, formInputClass } from "@/components/ui/FormSection";

export default function EditUserPage() {
    const router = useRouter();
    const { uid } = useParams<{ uid: string }>();
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"manager" | "viewer">("viewer");
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRids, setSelectedRids] = useState<string[]>([]);
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);

    // Dirty tracking for unsaved changes
    const initialDataRef = useRef<string>("");
    const currentData = JSON.stringify({ name, role, selectedRids });
    useUnsavedChanges(loaded && currentData !== initialDataRef.current);

    useEffect(() => {
        Promise.all([getUser(uid), listRestaurants()]).then(([u, rests]) => {
            if (u) {
                setUser(u);
                setName(u.name || "");
                setEmail(u.email || "");
                setRole(u.role || "viewer");
                setBgPreview(u.backgroundImagePath || null);
                setSelectedRids(u.restaurantIds || []);
                initialDataRef.current = JSON.stringify({
                    name: u.name || "",
                    role: u.role || "viewer",
                    selectedRids: u.restaurantIds || [],
                });
            }
            setRestaurants(rests);
            setLoaded(true);
        }).catch(() => {
            toast("Failed to load user data", "error");
            setLoaded(true);
        });
    }, [uid]);

    function toggleRestaurant(rid: string) {
        setSelectedRids(prev =>
            prev.includes(rid)
                ? prev.filter(r => r !== rid)
                : [...prev, rid]
        );
    }

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setBgFile(file);
            setBgPreview(URL.createObjectURL(file));
            toast("Image selected");
        }
    }

    async function handleRemoveBg() {
        try {
            if (user?.backgroundImagePath) {
                await deleteImageByPath(user.backgroundImagePath);
            }
            setBgFile(null);
            setBgPreview(null);
            toast("Background image removed");
        } catch (err) {
            console.error("Failed to remove background:", err);
            toast("Failed to remove background image", "error");
        }
    }

    async function handleSave() {
        if (!name.trim()) {
            toast("Name cannot be empty", "error");
            return;
        }
        if (role === "viewer" && selectedRids.length === 0) {
            toast("Viewers must have at least 1 restaurant assigned", "error");
            return;
        }
        setBusy(true);
        try {
            const updates: any = {
                name: name.trim(),
                role,
                restaurantIds: role === "viewer" ? selectedRids : [],
            };

            if (bgFile) {
                const { url, path } = await uploadUserBackgroundImage(bgFile, uid);
                updates.backgroundImagePath = path;
                toast("Image uploaded");
            } else if (bgPreview === null && user?.backgroundImagePath) {
                // User removed background image
                updates.backgroundImagePath = null;
            }

            await updateUser(uid, updates);
            toast("User updated successfully!");
        } catch (err) {
            console.error(err);
            toast("Failed to update user", "error");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        const ok = await confirm({ title: "Delete User", message: "Are you sure you want to delete this user? This cannot be undone.", destructive: true });
        if (!ok) return;
        setBusy(true);
        try {
            await deleteUser(uid);
            toast("User deleted");
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err) {
            console.error(err);
            toast("Failed to delete user", "error");
            setBusy(false);
        }
    }

    // Random color based on user initial
    const avatarColors = [
        "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-green-500",
        "bg-orange-500", "bg-red-500", "bg-indigo-500", "bg-teal-500"
    ];
    const avatarColor = avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

    const breadcrumbs = [
        { label: "Users", href: "/admin/users" },
        { label: name || "User" },
    ];

    if (!loaded) return <Page title="Loading..." breadcrumbs={breadcrumbs}><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;
    if (!user) return <Page title="Not Found"><div className="text-center py-20 text-gray-400">User not found</div></Page>;

    return (
        <Page title="Edit User" showBack={true} breadcrumbs={breadcrumbs}>
            <div className="max-w-xl mx-auto space-y-2 py-4 px-4">

                {/* Page Header */}
                <div className="mb-6">
                    <div className="flex flex-col items-center gap-3 mb-4">
                        <div className={`w-20 h-20 ${avatarColor} rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                            {name.charAt(0).toUpperCase() || "?"}
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-1 text-center">Edit User</h2>
                    <p className="text-gray-400 font-medium text-sm text-center">{email}</p>
                </div>

                {/* Section 1 — User Info */}
                <FormSection title="User Info" description="Basic account details for this user.">
                    <FormCard>
                        <FormField label="Full Name" required>
                            <input
                                className={formInputClass}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Email Address" hint="Email cannot be changed">
                            <input
                                className={`${formInputClass} opacity-50`}
                                value={email}
                                disabled
                            />
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* Section 2 — Role & Access */}
                <FormSection title="Role & Access" description="Managers can access all restaurants and settings. Viewers only see their assigned restaurants.">
                    <FormCard>
                        <FormRow label="Role">
                            <div className="bg-gray-100 p-1 rounded-full flex gap-1">
                                <button
                                    onClick={() => setRole("viewer")}
                                    role="switch"
                                    aria-checked={role === "viewer"}
                                    className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "viewer" ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                                >
                                    Viewer
                                </button>
                                <button
                                    onClick={() => setRole("manager")}
                                    role="switch"
                                    aria-checked={role === "manager"}
                                    className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "manager" ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                                >
                                    Manager
                                </button>
                            </div>
                        </FormRow>
                    </FormCard>

                    {role === "viewer" && (
                        <div className="mt-4">
                            <FormCard>
                                <FormField label="Restaurant Access" hint="Select at least one restaurant for this viewer">
                                    <div className="space-y-2 mt-1">
                                        {restaurants.map(r => {
                                            const selected = selectedRids.includes(r.id);
                                            return (
                                                <div
                                                    key={r.id}
                                                    onClick={() => toggleRestaurant(r.id)}
                                                    className={`w-full h-12 px-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                                        selected
                                                            ? "bg-green-50 border-green-800"
                                                            : "bg-white border-gray-100 hover:bg-gray-50"
                                                    }`}
                                                >
                                                    <span className="font-medium text-[15px]">{r.name}</span>
                                                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
                                                        selected ? 'border-green-800 bg-green-800' : 'border-gray-200'
                                                    }`}>
                                                        {selected && (
                                                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </FormField>
                            </FormCard>
                        </div>
                    )}
                </FormSection>

                {/* Section 3 — Profile */}
                <FormSection title="Profile" description="Optional profile customization.">
                    <input type="file" id="user-bg" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <FormCard>
                        <FormField label="Background Image" hint="Ideal: 2048x2048px or 1920x1080px. Max 10 MB.">
                            {bgPreview ? (
                                <div className="relative w-full h-40 rounded-xl overflow-hidden mt-1">
                                    <img src={bgPreview} alt="Background" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                        <button
                                            onClick={() => document.getElementById('user-bg')?.click()}
                                            aria-label="Change background image"
                                            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={handleRemoveBg}
                                            aria-label="Remove background image"
                                            className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={() => document.getElementById('user-bg')?.click()}
                                    className="w-full h-14 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center gap-2 text-green-800 font-bold cursor-pointer hover:bg-gray-100 active:scale-[0.99] transition-all mt-1"
                                >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                                    Select Background Image
                                </div>
                            )}
                        </FormField>
                    </FormCard>
                </FormSection>

                {/* Save Button */}
                <button
                    disabled={busy || !name.trim()}
                    onClick={handleSave}
                    className="w-full px-5 py-3 bg-green-800 text-white font-bold rounded-2xl hover:bg-green-900 shadow-xl shadow-green-800/10 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? "Saving..." : "Save Changes"}
                </button>

                {/* Section 4 — Danger Zone */}
                {canDelete && (
                    <FormSection title="Danger Zone" description="Irreversible actions. Please be careful.">
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl overflow-hidden">
                            <div className="px-5 py-4 flex items-center justify-between">
                                <div>
                                    <span className="text-[15px] font-medium text-red-700">Delete User</span>
                                    <p className="text-[12px] text-red-400 mt-0.5">This action cannot be undone. All data will be permanently removed.</p>
                                </div>
                                <button
                                    disabled={busy}
                                    onClick={handleDelete}
                                    aria-label="Delete user"
                                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </FormSection>
                )}
            </div>
        </Page>
    );
}
