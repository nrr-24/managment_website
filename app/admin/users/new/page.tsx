"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createUser, listRestaurants, Restaurant } from "@/lib/data";

export default function NewUserPage() {
    const router = useRouter();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"manager" | "viewer">("viewer");
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRid, setSelectedRid] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        listRestaurants().then(setRestaurants);
    }, []);

    async function handleCreate() {
        if (!name.trim() || !email.trim()) return;
        setBusy(true);
        try {
            await createUser({
                name: name.trim(),
                email: email.trim(),
                role,
                restaurantAccess: selectedRid ? [selectedRid] : [],
            });
            showToast("User created successfully!");
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err) {
            console.error(err);
            showToast("Failed to create user", "error");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page title="Create User" showBack={true}>
            <div className="max-w-xl mx-auto space-y-8 py-8 px-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Create User</h1>
                    <p className="text-gray-400 font-medium">Add a new user to the system.</p>
                </div>

                <div className="space-y-4">
                    <input
                        placeholder="Full Name"
                        className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium focus:border-blue-500 transition-all"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium focus:border-blue-500 transition-all"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium focus:border-blue-500 transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
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

                <div className="space-y-3">
                    <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Restaurant Access</span>
                    <div className="space-y-2">
                        {restaurants.map(r => (
                            <div
                                key={r.id}
                                onClick={() => setSelectedRid(r.id)}
                                className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer group"
                            >
                                <span className="font-bold">{r.name}</span>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${selectedRid === r.id ? 'border-pink-500 bg-pink-500' : 'border-gray-200'}`}>
                                    {selectedRid === r.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    disabled={busy || !name.trim() || !email.trim()}
                    onClick={handleCreate}
                    className="w-full h-14 rounded-2xl bg-gray-600 hover:bg-black font-bold text-white shadow-xl shadow-black/10 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? "Creating..." : "Create User"}
                </button>
            </div>
            {ToastComponent}
        </Page>
    );
}
