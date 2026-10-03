"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { CategoryListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { FeedbackForm, createForm, deleteForm, getRestaurant, listForms } from "@/lib/data";

export default function FormsPage() {
    const { rid } = useParams<{ rid: string }>();
    const router = useRouter();
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [forms, setForms] = useState<FeedbackForm[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [restaurantName, setRestaurantName] = useState("");
    const [newTitle, setNewTitle] = useState("");
    const [creating, setCreating] = useState(false);

    async function refresh() {
        try {
            setForms(await listForms(rid));
        } catch {
            toast("Failed to load forms", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        getRestaurant(rid).then((r) => r && setRestaurantName(r.name || ""));
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rid]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const title = newTitle.trim();
        if (!title) return;
        setCreating(true);
        try {
            const id = await createForm(rid, title);
            router.push(`/admin/restaurants/${rid}/forms/${id}`);
        } catch {
            toast("Failed to create form", "error");
            setCreating(false);
        }
    }

    async function handleDelete(form: FeedbackForm) {
        const ok = await confirm({
            title: "Delete Form",
            message: `Delete "${form.title}" and all of its responses? This cannot be undone.`,
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteForm(rid, form.id);
            toast("Form deleted");
            refresh();
        } catch {
            toast("Failed to delete form", "error");
        }
    }

    return (
        <Page
            title="Feedback Forms"
            backPath={`/admin/restaurants/${rid}`}
            breadcrumbs={[
                { label: "Restaurants", href: "/admin/restaurants" },
                { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
                { label: "Feedback" },
            ]}
        >
            <p className="text-sm text-gray-400 px-1">
                Build forms that customers fill out in the app, then review what they said.
            </p>

            <form onSubmit={handleCreate} className="flex gap-2">
                <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="New form title, e.g. Customer Feedback"
                    aria-label="New form title"
                    className="flex-1 h-12 px-5 rounded-2xl border border-gray-100 bg-white text-gray-900 font-medium placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all"
                />
                <Button type="submit" loading={creating} disabled={!newTitle.trim()}>
                    Create
                </Button>
            </form>

            {!loaded ? (
                <CategoryListSkeleton />
            ) : forms.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="font-semibold text-gray-900 mb-1">No forms yet</p>
                    <p className="text-sm text-gray-400">Create your first form above.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {forms.map((form) => (
                        <Card key={form.id} className="p-3 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/restaurants/${rid}/forms/${form.id}`} className="flex-1 min-w-0 px-2 py-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600 truncate">{form.title}</span>
                                        <span
                                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                                form.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                                            }`}
                                        >
                                            {form.isActive ? "Live" : "Hidden"}
                                        </span>
                                    </div>
                                    <p className="text-[12px] text-gray-400 mt-0.5">
                                        {form.questions.length} question{form.questions.length === 1 ? "" : "s"}
                                    </p>
                                </Link>
                                <Link
                                    href={`/admin/restaurants/${rid}/forms/${form.id}/responses`}
                                    className="px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-50 rounded-lg transition-colors shrink-0"
                                >
                                    Responses
                                </Link>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDelete(form)}
                                        aria-label={`Delete ${form.title}`}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </Page>
    );
}
