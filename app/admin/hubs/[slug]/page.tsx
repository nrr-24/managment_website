"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { Page } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { MenuHub, Restaurant, getMenuHub, listRestaurants, updateMenuHub } from "@/lib/data";
import { hubUrl } from "@/lib/site";

const inputClass =
    "w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all";

export default function HubEditPage() {
    const { slug } = useParams<{ slug: string }>();
    const { toast } = useGlobalUI();

    const [loaded, setLoaded] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);
    const [all, setAll] = useState<Restaurant[]>([]);
    const [title, setTitle] = useState("");
    const [titleAr, setTitleAr] = useState("");
    const [ids, setIds] = useState<string[]>([]);
    const [saved, setSaved] = useState("");
    const [qr, setQr] = useState("");

    const url = hubUrl(slug);
    const snapshot = useMemo(() => JSON.stringify({ title, titleAr, ids }), [title, titleAr, ids]);
    const dirty = loaded && snapshot !== saved;

    useEffect(() => {
        Promise.all([getMenuHub(slug), listRestaurants()])
            .then(([hub, restaurants]) => {
                const sorted = [...restaurants].sort((a, b) =>
                    (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" })
                );
                setAll(sorted);
                if (!hub) {
                    setNotFound(true);
                    return;
                }
                const valid = hub.restaurantIds.filter((id) => sorted.some((r) => r.id === id));
                setTitle(hub.title);
                setTitleAr(hub.titleAr ?? "");
                setIds(valid);
                setSaved(JSON.stringify({ title: hub.title, titleAr: hub.titleAr ?? "", ids: valid }));
            })
            .catch(() => toast("Failed to load", "error"))
            .finally(() => setLoaded(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    // The QR only encodes the link, so it never changes when restaurants are edited.
    useEffect(() => {
        QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
            .then(setQr)
            .catch(() => setQr(""));
    }, [url]);

    useEffect(() => {
        if (!dirty) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    async function handleSave() {
        if (!title.trim()) {
            toast("Give it a name", "error");
            return;
        }
        setSaving(true);
        try {
            await updateMenuHub(slug, { title: title.trim(), titleAr: titleAr.trim(), restaurantIds: ids });
            setTitle(title.trim());
            setTitleAr(titleAr.trim());
            setSaved(JSON.stringify({ title: title.trim(), titleAr: titleAr.trim(), ids }));
            toast("Saved");
        } catch {
            toast("Failed to save", "error");
        }
        setSaving(false);
    }

    function move(id: string, dir: -1 | 1) {
        setIds((list) => {
            const i = list.indexOf(id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= list.length) return list;
            const next = [...list];
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    }

    async function copyLink() {
        try {
            await navigator.clipboard.writeText(url);
            toast("Link copied");
        } catch {
            toast("Couldn't copy — select the link and copy it", "error");
        }
    }

    const crumbs = [{ label: "QR Codes", href: "/admin/hubs" }, { label: title || slug }];
    const actions = (
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
            Save
        </Button>
    );

    if (!loaded) {
        return (
            <Page title="QR Page" backPath="/admin/hubs" breadcrumbs={crumbs}>
                <Skeleton className="h-64 w-full" />
            </Page>
        );
    }
    if (notFound) {
        return (
            <Page title="QR Page" backPath="/admin/hubs" breadcrumbs={crumbs}>
                <p className="text-center text-gray-400 py-16">This QR page no longer exists.</p>
            </Page>
        );
    }

    // Selected restaurants in the hub's order, then the rest
    const selected = ids.map((id) => all.find((r) => r.id === id)).filter((r): r is Restaurant => !!r);
    const unselected = all.filter((r) => !ids.includes(r.id));

    return (
        <Page title={title || "QR Page"} actions={actions} backPath="/admin/hubs" breadcrumbs={crumbs}>
            {/* QR code */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-5 flex flex-col items-center gap-4">
                {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt={`QR code for ${title}`} className="w-60 h-60 rounded-xl border border-gray-100" />
                ) : (
                    <Skeleton className="w-60 h-60" />
                )}
                <p className="text-[13px] text-gray-500 break-all text-center">{url}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    <a
                        href={qr || undefined}
                        download={`${slug}-qr.png`}
                        aria-disabled={!qr}
                        className={`px-4 py-2.5 rounded-xl bg-green-800 text-white text-sm font-semibold hover:bg-green-900 transition ${qr ? "" : "opacity-40 pointer-events-none"}`}
                    >
                        Download PNG
                    </a>
                    <Button variant="secondary" onClick={copyLink}>Copy link</Button>
                    <a
                        href={`/hub/${slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 transition"
                    >
                        Open page
                    </a>
                </div>
                <p className="text-[12px] text-gray-400 text-center max-w-sm">
                    This code never changes. Add or remove restaurants below and the same printed code shows the update.
                </p>
            </div>

            {/* Names */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 space-y-3">
                <div>
                    <label htmlFor="hub-title" className="block text-[13px] font-medium text-gray-500 mb-1.5">Title</label>
                    <input id="hub-title" value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} font-semibold`} />
                </div>
                <div>
                    <label htmlFor="hub-title-ar" className="block text-[13px] font-medium text-gray-500 mb-1.5">Title (Arabic, optional)</label>
                    <input id="hub-title-ar" dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className={inputClass} />
                </div>
            </div>

            {/* Restaurants */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5">
                <h3 className="text-[15px] font-bold text-gray-900">Restaurants on this page</h3>
                <p className="text-[12px] text-gray-400 mt-0.5 mb-3">Customers see them in this order.</p>

                {selected.length === 0 ? (
                    <p className="text-[13px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">Nothing selected yet — pick restaurants below.</p>
                ) : (
                    <ul className="space-y-2">
                        {selected.map((r, i) => (
                            <li key={r.id} className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-green-800/30 bg-green-50/50">
                                <span className="flex-1 min-w-0 text-[15px] text-gray-900 truncate">{r.name}</span>
                                <button
                                    type="button"
                                    onClick={() => move(r.id, -1)}
                                    disabled={i === 0}
                                    aria-label={`Move ${r.name} up`}
                                    className="p-1.5 text-gray-500 hover:bg-white rounded-lg disabled:opacity-25"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => move(r.id, 1)}
                                    disabled={i === selected.length - 1}
                                    aria-label={`Move ${r.name} down`}
                                    className="p-1.5 text-gray-500 hover:bg-white rounded-lg disabled:opacity-25"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIds((l) => l.filter((x) => x !== r.id))}
                                    aria-label={`Remove ${r.name}`}
                                    className="p-1.5 text-red-500 hover:bg-white rounded-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {unselected.length > 0 && (
                    <>
                        <p className="text-[13px] font-medium text-gray-500 mt-5 mb-2">Add a restaurant</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {unselected.map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setIds((l) => [...l, r.id])}
                                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-left transition-colors"
                                >
                                    <svg className="w-4 h-4 text-green-800 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[15px] text-gray-900 truncate">{r.name}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </Page>
    );
}
