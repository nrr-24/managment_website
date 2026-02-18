"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getUser, updateUser, deleteUser, uploadUserBackgroundImage, deleteImageByPath, listRestaurants, User, Restaurant } from "@/lib/data";

export default function EditUserPage() {
    const router = useRouter();
    const { uid } = useParams<{ uid: string }>();
    const { showToast, ToastComponent } = useToast();

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

    useEffect(() => {
        Promise.all([getUser(uid), listRestaurants()]).then(([u, rests]) => {
            if (u) {
                setUser(u);
                setName(u.name || "");
                setEmail(u.email || "");
                setRole(u.role || "viewer");
                setBgPreview(u.backgroundImage || null);
                setSelectedRids(u.restaurantAccess || []);
            }
            setRestaurants(rests);
            setLoaded(true);
        }).catch(() => {
            showToast("Failed to load user data", "error");
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
            showToast("Image selected");
        }
    }

    async function handleRemoveBg() {
        // Delete from storage if there's an existing path
        if (user?.backgroundImagePath) {
            await deleteImageByPath(user.backgroundImagePath);
        }
        setBgFile(null);
        setBgPreview(null);
        showToast("Background image removed");
    }

    async function handleSave() {
        if (!name.trim()) {
            showToast("Name cannot be empty", "error");
            return;
        }
        if (role === "viewer" && selectedRids.length === 0) {
            showToast("Viewers must have at least 1 restaurant assigned", "error");
            return;
        }
        setBusy(true);
        try {
            const updates: any = {
                name: name.trim(),
                role,
                restaurantAccess: role === "viewer" ? selectedRids : [],
            };

            if (bgFile) {
                const { url, path } = await uploadUserBackgroundImage(bgFile, uid);
                updates.backgroundImage = url;
                updates.backgroundImagePath = path;
                showToast("Image uploaded");
            } else if (bgPreview === null && user?.backgroundImage) {
                // User removed background image
                updates.backgroundImage = null;
                updates.backgroundImagePath = null;
            }

            await updateUser(uid, updates);
            showToast("User updated successfully!");
        } catch (err) {
            console.error(err);
            showToast("Failed to update user", "error");
        } finally {
            setBusy(false);
        }
    }

    async function handleDelete() {
        if (!confirm("Are you sure you want to delete this user?")) return;
        setBusy(true);
        try {
            await deleteUser(uid);
            showToast("User deleted");
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err) {
            console.error(err);
            showToast("Failed to delete user", "error");
            setBusy(false);
        }
    }

    // Random color based on user initial
    const avatarColors = [
        "bg-purple-500", "bg-pink-500", "bg-blue-500", "bg-green-500",
        "bg-orange-500", "bg-red-500", "bg-indigo-500", "bg-teal-500"
    ];
    const avatarColor = avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length];

    if (!loaded) return <Page title="Loading..."><div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-gray-200 border-t-green-800 rounded-full animate-spin" /></div></Page>;
    if (!user) return <Page title="Not Found"><div className="text-center py-20 text-gray-400">User not found</div></Page>;

    return (
        <Page title="Edit User" showBack={true}>
            <div className="max-w-xl mx-auto space-y-8 py-4 px-4">
                {/* Avatar & Identity */}
                <div className="flex flex-col items-center gap-3">
                    <div className={`w-20 h-20 ${avatarColor} rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg`}>
                        {name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Edit User</h1>
                        <p className="text-gray-400 font-medium text-sm">{email}</p>
                    </div>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                    <input
                        className="w-full h-12 px-6 rounded-2xl bg-white border border-gray-100 outline-none font-medium focus:border-green-800 transition-all"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                {/* Email Field (readonly) */}
                <div className="space-y-2 opacity-50">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                    <input
                        className="w-full h-12 px-6 rounded-2xl bg-white border border-gray-100 outline-none font-medium"
                        value={email}
                        disabled
                    />
                </div>

                {/* Role Toggle */}
                <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Role</span>
                    <div className="bg-gray-100 p-1 rounded-full flex gap-1">
                        <button
                            onClick={() => setRole("viewer")}
                            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "viewer" ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                        >
                            Viewer
                        </button>
                        <button
                            onClick={() => setRole("manager")}
                            className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "manager" ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                        >
                            Manager
                        </button>
                    </div>
                </div>

                {/* Restaurant Access */}
                {role === "viewer" && (
                    <div className="space-y-3">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Restaurant Access</span>
                        <p className="text-xs text-gray-400">Select which restaurants this viewer can access.</p>
                        <div className="space-y-2">
                            {restaurants.map(r => {
                                const selected = selectedRids.includes(r.id);
                                return (
                                    <div
                                        key={r.id}
                                        onClick={() => toggleRestaurant(r.id)}
                                        className={`w-full h-14 px-6 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                                            selected
                                                ? "bg-green-50 border-green-800"
                                                : "bg-white border-gray-100 hover:bg-gray-50"
                                        }`}
                                    >
                                        <span className="font-bold">{r.name}</span>
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
                    </div>
                )}

                {/* Background Image */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Background Image</label>
                    <input type="file" id="user-bg" className="hidden" accept="image/*" onChange={handleFileChange} />
                    {bgPreview ? (
                        <div className="relative w-full h-40 rounded-3xl overflow-hidden">
                            <img src={bgPreview} alt="Background" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center gap-3">
                                <button
                                    onClick={() => document.getElementById('user-bg')?.click()}
                                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleRemoveBg}
                                    className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                                >
                                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Card
                            onClick={() => document.getElementById('user-bg')?.click()}
                            className="w-full h-14 bg-white border border-gray-100 rounded-2xl flex items-center justify-center gap-2 text-green-800 font-bold cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-12.5-5.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                            Select Background Image
                        </Card>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-4">
                    <button
                        disabled={busy || !name.trim()}
                        onClick={handleSave}
                        className="w-full h-14 rounded-2xl bg-green-800 hover:bg-green-900 font-bold text-white shadow-xl shadow-green-800/10 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {busy ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                        disabled={busy}
                        onClick={handleDelete}
                        className="w-full h-14 rounded-2xl bg-white border border-red-100 text-red-500 font-bold transition-all flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete User
                    </button>
                </div>
            </div>
            {ToastComponent}
        </Page>
    );
}
