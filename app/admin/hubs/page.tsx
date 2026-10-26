"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { CategoryListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { HUB_SLUG_PATTERN, MenuHub, createMenuHub, deleteMenuHub, listMenuHubs, slugify } from "@/lib/data";
import { hubUrl } from "@/lib/site";

const inputClass =
    "w-full h-12 px-5 rounded-2xl border border-gray-100 bg-white text-gray-900 font-medium placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all";

export default function HubsPage() {
    const router = useRouter();
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [hubs, setHubs] = useState<MenuHub[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [slugEdited, setSlugEdited] = useState(false);
    const [creating, setCreating] = useState(false);

    async function refresh() {
        try {
            setHubs(await listMenuHubs());
        } catch {
            toast("Failed to load QR pages", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        const t = title.trim();
        if (!t) return;
        if (!HUB_SLUG_PATTERN.test(slug)) {
            toast("The link can only use lowercase letters, numbers and dashes", "error");
            return;
        }
        setCreating(true);
        try {
            await createMenuHub(slug, t);
            router.push(`/admin/hubs/${slug}`);
        } catch (err: any) {
            toast(err?.message === "exists" ? `The link "${slug}" is already used` : "Failed to create", "error");
            setCreating(false);
        }
    }

    async function handleDelete(h: MenuHub) {
        const ok = await confirm({
            title: "Delete QR Page",
            message: `Delete "${h.title}"? A printed QR code for it will stop working.`,
            destructive: true,
        });
        if (!ok) return;
        try {
            await deleteMenuHub(h.id);
            toast("Deleted");
            refresh();
        } catch {
            toast("Failed to delete", "error");
        }
    }

    return (
        <Page title="Menu QR Codes" backPath="/admin" breadcrumbs={[{ label: "QR Codes" }]}>
            <p className="text-sm text-gray-400 px-1">
                One QR code that opens a page listing several restaurants. Customers scan it, pick a restaurant and see its menu.
            </p>

            <form onSubmit={handleCreate} className="space-y-2">
                <input
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        if (!slugEdited) setSlug(slugify(e.target.value));
                    }}
                    placeholder="Name, e.g. Dine"
                    aria-label="QR page name"
                    className={inputClass}
                />
                <div className="flex gap-2">
                    <div className="flex-1 flex items-center rounded-2xl border border-gray-100 bg-white focus-within:border-green-800 focus-within:ring-2 focus-within:ring-green-800/10 transition-all overflow-hidden">
                        <span className="pl-5 text-gray-300 font-medium shrink-0">/hub/</span>
                        <input
                            value={slug}
                            onChange={(e) => {
                                setSlug(e.target.value.toLowerCase());
                                setSlugEdited(true);
                            }}
                            placeholder="dine"
                            aria-label="Link"
                            className="flex-1 min-w-0 h-12 pr-5 bg-transparent outline-none text-gray-900 font-medium placeholder:text-gray-300"
                        />
                    </div>
                    <Button type="submit" loading={creating} disabled={!title.trim() || !slug}>
                        Create
                    </Button>
                </div>
                <p className="text-[12px] text-gray-400 px-1">
                    The link is what the QR code contains, so pick it once. You can change which restaurants are listed any time without reprinting.
                </p>
            </form>

            {!loaded ? (
                <CategoryListSkeleton />
            ) : hubs.length === 0 ? (
                <Card className="text-center py-12">
                    <p className="font-semibold text-gray-900 mb-1">No QR pages yet</p>
                    <p className="text-sm text-gray-400">Create your first one above.</p>
                </Card>
            ) : (
                <div className="space-y-2">
                    {hubs.map((h) => (
                        <Card key={h.id} className="p-3 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-2">
                                <Link href={`/admin/hubs/${h.id}`} className="flex-1 min-w-0 px-2 py-1">
                                    <p className="font-bold text-blue-600 truncate">{h.title}</p>
                                    <p className="text-[12px] text-gray-400 mt-0.5 truncate">
                                        {hubUrl(h.id).replace(/^https?:\/\//, "")} · {h.restaurantIds.length} restaurant{h.restaurantIds.length === 1 ? "" : "s"}
                                    </p>
                                </Link>
                                {canDelete && (
                                    <button
                                        onClick={() => handleDelete(h)}
                                        aria-label={`Delete ${h.title}`}
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
