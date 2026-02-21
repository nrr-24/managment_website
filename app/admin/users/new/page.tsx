"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { useGlobalUI } from "@/components/ui/Toast";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { createUserWithAuth, listRestaurants, Restaurant } from "@/lib/data";
import { FormSection, FormCard, FormField, FormRow, formInputClass } from "@/components/ui/FormSection";

export default function NewUserPage() {
    const router = useRouter();
    const { toast } = useGlobalUI();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"manager" | "viewer">("viewer");
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRids, setSelectedRids] = useState<string[]>([]);
    const [busy, setBusy] = useState(false);

    useUnsavedChanges(name.trim().length > 0);

    useEffect(() => {
        listRestaurants().then(setRestaurants).catch(() => {
            toast("Failed to load restaurants", "error");
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
            toast("Please enter a name", "error");
            return;
        }
        if (!email.trim()) {
            toast("Please enter an email", "error");
            return;
        }
        if (!password.trim()) {
            toast("Please enter a password", "error");
            return;
        }
        if (password.length < 6) {
            toast("Password must be at least 6 characters", "error");
            return;
        }
        if (role === "viewer" && selectedRids.length === 0) {
            toast("Viewers must have at least 1 restaurant assigned", "error");
            return;
        }
        setBusy(true);
        try {
            await createUserWithAuth({
                name: name.trim(),
                email: email.trim(),
                password: password,
                role,
                restaurantIds: role === "viewer" ? selectedRids : [],
            });
            toast("User created successfully!");
            setTimeout(() => router.push('/admin/users'), 1000);
        } catch (err: any) {
            console.error(err);
            const msg = err.message || "";
            if (msg.includes("email-already-in-use")) {
                toast("This email is already in use", "error");
            } else if (msg.includes("weak-password")) {
                toast("Password is too weak (min 6 chars)", "error");
            } else if (msg.includes("invalid-email")) {
                toast("Invalid email address", "error");
            } else {
                toast(msg || "Failed to create user", "error");
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page title="Create User" showBack={true}>
            <div className="max-w-xl mx-auto space-y-2 py-4 px-4">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-1">Create User</h1>
                    <p className="text-gray-400 font-medium text-sm">Add a new user to the system.</p>
                </div>

                {/* Section 1 — User Info */}
                <FormSection title="User Info" description="Basic account details for this user.">
                    <FormCard>
                        <FormField label="Full Name" required>
                            <input
                                placeholder="John Doe"
                                className={formInputClass}
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Email Address" required>
                            <input
                                type="email"
                                placeholder="Email Address"
                                className={formInputClass}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </FormField>
                        <FormField label="Password" required hint="Minimum 6 characters">
                            <input
                                type="password"
                                placeholder="Password"
                                className={formInputClass}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
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
                                        {restaurants.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center py-4">No restaurants found.</p>
                                        )}
                                    </div>
                                </FormField>
                            </FormCard>
                        </div>
                    )}
                </FormSection>

                <button
                    disabled={busy || !name.trim() || !email.trim() || !password.trim()}
                    onClick={handleCreate}
                    className="px-5 py-3 bg-green-800 text-white font-bold rounded-2xl w-full hover:bg-green-900 shadow-xl shadow-green-800/10 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? "Creating..." : "Create User"}
                </button>
            </div>
        </Page>
    );
}
