"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createUserWithAuth, listRestaurants, Restaurant } from "@/lib/data";

export default function NewUserPage() {
    const router = useRouter();
    const { showToast, ToastComponent } = useToast();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"manager" | "viewer">("viewer");
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRids, setSelectedRids] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        listRestaurants().then(setRestaurants).catch(() => {
            showToast("Failed to load restaurants", "error");
        });
    }, []);

    function toggleRestaurant(rid: string) {
        setSelectedRids(prev =>
            prev.includes(rid)
                ? prev.filter(r => r !== rid)
                : [...prev, rid]
        );
    }

    async function handleCreate() {
        if (!name.trim()) {
            showToast("Please enter a name", "error");
            return;
        }
        if (!email.trim()) {
            showToast("Please enter an email", "error");
            return;
        }
        if (!password.trim()) {
            showToast("Please enter a password", "error");
            return;
        }
        if (password.length < 6) {
            showToast("Password must be at least 6 characters", "error");
            return;
        }
        if (role === "viewer" && selectedRids.length === 0) {
            showToast("Viewers must have at least 1 restaurant assigned", "error");
            return;
        }
        setBusy(true);
        try {
            await createUserWithAuth({
                name: name.trim(),
                email: email.trim(),
                password: password,
                role,
                restaurantAccess: role === "viewer" ? selectedRids : [],
            });
            showToast("User created successfully!");
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err: any) {
            console.error(err);
            const msg = err.message || "";
            if (msg.includes("email-already-in-use")) {
                showToast("This email is already in use", "error");
            } else if (msg.includes("weak-password")) {
                showToast("Password is too weak (min 6 chars)", "error");
            } else if (msg.includes("invalid-email")) {
                showToast("Invalid email address", "error");
            } else {
                showToast("Failed to create user", "error");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page title="Create User" showBack={true}>
            <div className="max-w-xl mx-auto space-y-8 py-4 px-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1">Create User</h1>
                    <p className="text-gray-400 font-medium text-sm">Add a new user to the system.</p>
                </div>

                <div className="space-y-3">
                    <input
                        placeholder="Full Name"
                        className="w-full h-14 px-6 rounded-2xl bg-white border border-gray-100 outline-none font-medium focus:border-green-800 transition-all"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                    <input
                        type="email"
                        placeholder="Email Address"
                        className="w-full h-14 px-6 rounded-2xl bg-white border border-gray-100 outline-none font-medium focus:border-green-800 transition-all"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password (min 6 characters)"
                        className="w-full h-14 px-6 rounded-2xl bg-white border border-gray-100 outline-none font-medium focus:border-green-800 transition-all"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

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
                            {restaurants.length === 0 && (
                                <p className="text-xs text-gray-400 text-center py-4">No restaurants found.</p>
                            )}
                        </div>
                    </div>
                )}

                <button
                    disabled={busy || !name.trim() || !email.trim() || !password.trim()}
                    onClick={handleCreate}
                    className="w-full h-14 rounded-2xl bg-green-800 hover:bg-green-900 font-bold text-white shadow-xl shadow-green-800/10 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? "Creating..." : "Create User"}
                </button>
            </div>
            {ToastComponent}
        </Page>
    );
}
