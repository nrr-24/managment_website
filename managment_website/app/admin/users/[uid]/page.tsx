"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { getUser, updateUser, deleteUser, uploadUserBackgroundImage, User } from "@/lib/data";

export default function EditUserPage() {
    const router = useRouter();
    const { uid } = useParams<{ uid: string }>();
    const { showToast, ToastComponent } = useToast();

    const [user, setUser] = useState<User | null>(null);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"manager" | "viewer">("viewer");
    const [bgFile, setBgFile] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getUser(uid).then(u => {
            if (u) {
                setUser(u);
                setName(u.name || "");
                setEmail(u.email || "");
                setRole(u.role || "viewer");
                setBgPreview(u.backgroundImage || null);
            }
            setLoaded(true);
        });
    }, [uid]);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setBgFile(file);
            setBgPreview(URL.createObjectURL(file));
        }
    }

    async function handleSave() {
        if (!name.trim()) return;
        setBusy(true);
        try {
            const updates: any = {
                name: name.trim(),
                role,
            };

            if (bgFile) {
                const { url, path } = await uploadUserBackgroundImage(bgFile, uid);
                updates.backgroundImage = url;
                updates.backgroundImagePath = path;
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

    if (!loaded) return <Page title="Loading..."><div>Loading...</div></Page>;
    if (!user) return <Page title="Not Found"><div>User not found</div></Page>;

    return (
        <Page title="Edit User">
            <div className="max-w-xl mx-auto space-y-8 py-8 px-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-pink-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold">Edit User</h1>
                        <p className="text-gray-400 font-medium">{email}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Name</label>
                        <input
                            className="w-full h-12 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2 opacity-50">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                        <input
                            className="w-full h-12 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium"
                            value={email}
                            disabled
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Role</span>
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex gap-1">
                            <button
                                onClick={() => setRole("viewer")}
                                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "viewer" ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
                            >
                                Viewer
                            </button>
                            <button
                                onClick={() => setRole("manager")}
                                className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${role === "manager" ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
                            >
                                Manager
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Background Image</label>
                        <input type="file" id="user-bg" className="hidden" accept="image/*" onChange={handleFileChange} />
                        <Card
                            onClick={() => document.getElementById('user-bg')?.click()}
                            className="w-full h-14 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-center gap-2 text-blue-500 font-bold active:scale-[0.99] transition-all"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c0 1.1.9 2 2 2zm-11-7l2.03 2.71L15 11l4.25 5.67H5L10 12z" /></svg>
                            {bgPreview ? "Change Background Image" : "Select Background Image"}
                        </Card>
                        {bgPreview && (
                            <img src={bgPreview} alt="Preview" className="w-full h-32 object-cover rounded-2xl" />
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <button
                        disabled={busy || !name.trim()}
                        onClick={handleSave}
                        className="w-full h-14 rounded-2xl bg-gray-600 hover:bg-black font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {busy ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                        disabled={busy}
                        onClick={handleDelete}
                        className="w-full h-14 rounded-2xl bg-white dark:bg-gray-800 border border-red-100 dark:border-red-900/30 text-red-500 font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
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
