"use client";

import { useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { CategoryListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import {
    FeedbackRestaurant,
    createFeedbackRestaurant,
    deleteFeedbackRestaurant,
    listFeedbackRestaurants,
    newFeedbackBranch,
    updateFeedbackRestaurant,
} from "@/lib/data";

const inputClass =
    "w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all";

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

function RestaurantCard({
    restaurant,
    canDelete,
    otherNames,
    onSave,
    onDelete,
}: {
    restaurant: FeedbackRestaurant;
    canDelete: boolean;
    otherNames: string[];
    onSave: (patch: Partial<Pick<FeedbackRestaurant, "name" | "branches">>) => Promise<boolean>;
    onDelete: () => void;
}) {
    const { toast } = useGlobalUI();
    const [name, setName] = useState(restaurant.name);
    const [branchDraft, setBranchDraft] = useState("");

    // Keep the field in sync if the list is reloaded
    useEffect(() => setName(restaurant.name), [restaurant.name]);

    async function commitName() {
        const next = name.trim();
        if (next === restaurant.name) return;
        if (!next) {
            setName(restaurant.name);
            toast("A restaurant needs a name", "error");
            return;
        }
        if (otherNames.some((n) => sameName(n, next))) {
            setName(restaurant.name);
            toast(`"${next}" is already in the list`, "error");
            return;
        }
        if (!(await onSave({ name: next }))) setName(restaurant.name);
    }

    async function addBranch(e: React.FormEvent) {
        e.preventDefault();
        const next = branchDraft.trim();
        if (!next) return;
        if (restaurant.branches.some((b) => sameName(b.name, next))) {
            toast(`"${next}" is already a branch`, "error");
            return;
        }
        if (await onSave({ branches: [...restaurant.branches, newFeedbackBranch(next)] })) setBranchDraft("");
    }

    return (
        <Card className="p-4 sm:p-5 rounded-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-2">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    aria-label="Restaurant name"
                    className={`${inputClass} font-bold`}
                />
                {canDelete && (
                    <button
                        onClick={onDelete}
                        aria-label={`Delete ${restaurant.name}`}
                        className="p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                )}
            </div>

            <div>
                <p className="text-[13px] font-medium text-gray-500 mb-2">Branches</p>
                {restaurant.branches.length === 0 ? (
                    <p className="text-[13px] text-gray-400 mb-2">No branches — customers will only pick the restaurant.</p>
                ) : (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {restaurant.branches.map((b) => (
                            <span key={b.id} className="inline-flex items-center gap-1 pl-3.5 pr-1.5 py-1.5 rounded-full bg-gray-100 text-[14px] text-gray-800 font-medium">
                                {b.name}
                                <button
                                    onClick={() => onSave({ branches: restaurant.branches.filter((x) => x.id !== b.id) })}
                                    aria-label={`Remove branch ${b.name}`}
                                    className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-white transition-colors"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <form onSubmit={addBranch} className="flex gap-2">
                    <input
                        value={branchDraft}
                        onChange={(e) => setBranchDraft(e.target.value)}
                        placeholder="Add a branch, e.g. Salmiya"
                        aria-label={`Add a branch to ${restaurant.name}`}
                        className={inputClass}
                    />
                    <Button type="submit" variant="secondary" disabled={!branchDraft.trim()}>
                        Add
                    </Button>
                </form>
            </div>
        </Card>
    );
}

export default function FeedbackRestaurantsPage() {
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [restaurants, setRestaurants] = useState<FeedbackRestaurant[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [newName, setNewName] = useState("");
    const [adding, setAdding] = useState(false);

    async function refresh() {
        try {
            setRestaurants(await listFeedbackRestaurants());
        } catch {
            toast("Failed to load restaurants", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;
        if (restaurants.some((r) => sameName(r.name, name))) {
            toast(`"${name}" is already in the list`, "error");
            return;
        }
        setAdding(true);
        try {
            await createFeedbackRestaurant(name);
            setNewName("");
            await refresh();
        } catch {
            toast("Failed to add restaurant", "error");
        }
        setAdding(false);
    }

    /** Saves a change; returns whether it worked so cards can roll back their input. */
    async function save(r: FeedbackRestaurant, patch: Partial<Pick<FeedbackRestaurant, "name" | "branches">>): Promise<boolean> {
        try {
            await updateFeedbackRestaurant(r.id, patch);
            await refresh();
            return true;
        } catch {
            toast("Failed to save changes", "error");
            return false;
        }
    }

    async function handleDelete(r: FeedbackRestaurant) {
        const ok = await confirm({
            title: "Remove Restaurant",
            message: `Remove "${r.name}" and its branches from the feedback form? Past responses keep the name they were submitted with.`,
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteFeedbackRestaurant(r.id);
            toast("Restaurant removed");
            refresh();
        } catch {
            toast("Failed to remove restaurant", "error");
        }
    }

    return (
        <Page
            title="Restaurants & Branches"
            backPath="/admin/feedback"
            breadcrumbs={[{ label: "Feedback", href: "/admin/feedback" }, { label: "Restaurants & branches" }]}
        >
            <p className="text-sm text-gray-400 px-1">
                Customers choose from this list at the start of every feedback form: first the restaurant, then its branch. Changes save as you go.
            </p>

            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="New restaurant name, e.g. Wok N Roll"
                    aria-label="New restaurant name"
                    className="flex-1 h-12 px-5 rounded-2xl border border-gray-100 bg-white text-gray-900 font-medium placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all"
                />
                <Button type="submit" loading={adding} disabled={!newName.trim()}>
                    Add
                </Button>
            </form>

            {!loaded ? (
                <CategoryListSkeleton />
            ) : restaurants.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="font-semibold text-gray-900 mb-1">No restaurants yet</p>
                    <p className="text-sm text-gray-400">Until you add some, customers won&apos;t be asked which restaurant they visited.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {restaurants.map((r) => (
                        <RestaurantCard
                            key={r.id}
                            restaurant={r}
                            canDelete={canDelete}
                            otherNames={restaurants.filter((x) => x.id !== r.id).map((x) => x.name)}
                            onSave={(patch) => save(r, patch)}
                            onDelete={() => handleDelete(r)}
                        />
                    ))}
                </div>
            )}
        </Page>
    );
}
