"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useGlobalUI } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import {
    FeedbackForm,
    FormAnswer,
    FormResponse,
    deleteFormResponse,
    getForm,
    listFormResponses,
} from "@/lib/data";

const SMILEYS = ["😞", "🙁", "😐", "🙂", "😄"];
const ALL = "__all__";

function formatDate(ts: any): string {
    const ms = ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0);
    return ms ? new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
}

function AnswerValue({ answer }: { answer: FormAnswer }) {
    const v = answer.value;
    if (v === null || v === undefined || v === "") return <span className="text-gray-300">No answer</span>;
    if (answer.type === "stars" && typeof v === "number") {
        return (
            <span className="text-amber-400 tracking-wide" aria-label={`${v} out of 5 stars`}>
                {"★".repeat(v)}
                <span className="text-gray-200">{"★".repeat(Math.max(0, 5 - v))}</span>
            </span>
        );
    }
    if (answer.type === "smiley" && typeof v === "number") {
        return <span className="text-2xl" aria-label={`${v} out of 5`}>{SMILEYS[v - 1] ?? v}</span>;
    }
    if (answer.type === "yesno" && typeof v === "boolean") {
        return <span className={`font-semibold ${v ? "text-green-700" : "text-red-500"}`}>{v ? "Yes" : "No"}</span>;
    }
    return <span className="text-gray-900 whitespace-pre-wrap">{String(v)}</span>;
}

const filterClass =
    "h-10 px-3 rounded-xl border border-gray-200 bg-white text-[14px] text-gray-900 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all max-w-full";

export default function ResponsesPage() {
    const { fid } = useParams<{ fid: string }>();
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [form, setForm] = useState<FeedbackForm | null>(null);
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [restaurantFilter, setRestaurantFilter] = useState(ALL);
    const [branchFilter, setBranchFilter] = useState(ALL);

    async function refresh() {
        try {
            const [f, r] = await Promise.all([getForm(fid), listFormResponses(fid)]);
            setForm(f);
            setResponses(r);
        } catch {
            toast("Failed to load responses", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fid]);

    // Filter options come from what customers actually submitted (names are snapshots).
    const restaurantOptions = useMemo(
        () => Array.from(new Set(responses.map((r) => r.restaurantName).filter((n): n is string => !!n))).sort((a, b) => a.localeCompare(b)),
        [responses]
    );
    const branchOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    responses
                        .filter((r) => restaurantFilter === ALL || r.restaurantName === restaurantFilter)
                        .map((r) => r.branchName)
                        .filter((n): n is string => !!n)
                )
            ).sort((a, b) => a.localeCompare(b)),
        [responses, restaurantFilter]
    );

    const filtered = useMemo(
        () =>
            responses.filter(
                (r) =>
                    (restaurantFilter === ALL || r.restaurantName === restaurantFilter) &&
                    (branchFilter === ALL || r.branchName === branchFilter)
            ),
        [responses, restaurantFilter, branchFilter]
    );

    // Per-question summary over the filtered responses, in the form's current question order
    const summaries = useMemo(() => {
        if (!form) return [];
        return form.questions.map((q) => {
            const answers = filtered
                .map((r) => r.answers.find((a) => a.questionId === q.id))
                .filter((a): a is FormAnswer => !!a && a.value !== null && a.value !== undefined && a.value !== "");
            let summary = "";
            if (q.type === "stars" || q.type === "smiley") {
                const nums = answers.map((a) => a.value).filter((v): v is number => typeof v === "number");
                summary = nums.length ? `${(nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1)} / 5 average` : "";
            } else if (q.type === "yesno") {
                const yes = answers.filter((a) => a.value === true).length;
                summary = answers.length ? `${yes} yes · ${answers.length - yes} no` : "";
            }
            return { question: q, count: answers.length, summary };
        });
    }, [form, filtered]);

    async function handleDelete(id: string) {
        const ok = await confirm({ title: "Delete Response", message: "Delete this response? This cannot be undone.", destructive: true });
        if (!ok) return;
        try {
            await deleteFormResponse(fid, id);
            setResponses((rs) => rs.filter((r) => r.id !== id));
            toast("Response deleted");
        } catch {
            toast("Failed to delete response", "error");
        }
    }

    const title = form?.title ? `${form.title} · Responses` : "Responses";
    const isFiltered = restaurantFilter !== ALL || branchFilter !== ALL;

    return (
        <Page
            title={title}
            backPath={`/admin/feedback/${fid}`}
            maxWidth="max-w-4xl"
            breadcrumbs={[
                { label: "Feedback", href: "/admin/feedback" },
                { label: form?.title || "Form", href: `/admin/feedback/${fid}` },
                { label: "Responses" },
            ]}
        >
            {!loaded ? (
                <div className="space-y-3">
                    <Skeleton className="h-28 w-full" />
                    <Skeleton className="h-28 w-full" />
                </div>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                        <h2 className="text-2xl font-bold">
                            {filtered.length} response{filtered.length === 1 ? "" : "s"}
                            {isFiltered && <span className="text-base font-medium text-gray-400"> of {responses.length}</span>}
                        </h2>
                        {restaurantOptions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                <select
                                    aria-label="Filter by restaurant"
                                    value={restaurantFilter}
                                    onChange={(e) => {
                                        setRestaurantFilter(e.target.value);
                                        setBranchFilter(ALL);
                                    }}
                                    className={filterClass}
                                >
                                    <option value={ALL}>All restaurants</option>
                                    {restaurantOptions.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                {branchOptions.length > 0 && (
                                    <select
                                        aria-label="Filter by branch"
                                        value={branchFilter}
                                        onChange={(e) => setBranchFilter(e.target.value)}
                                        className={filterClass}
                                    >
                                        <option value={ALL}>All branches</option>
                                        {branchOptions.map((n) => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                    </div>

                    {responses.length === 0 ? (
                        <Card className="text-center py-12">
                            <p className="font-semibold text-gray-900 mb-1">No responses yet</p>
                            <p className="text-sm text-gray-400">
                                {form?.isActive ? "Customers haven't submitted this form yet." : "Turn on “Show in the app” so customers can fill this out."}
                            </p>
                        </Card>
                    ) : filtered.length === 0 ? (
                        <Card className="text-center py-12">
                            <p className="font-semibold text-gray-900 mb-1">No responses match these filters</p>
                            <button
                                onClick={() => {
                                    setRestaurantFilter(ALL);
                                    setBranchFilter(ALL);
                                }}
                                className="text-sm font-semibold text-green-800 hover:underline"
                            >
                                Clear filters
                            </button>
                        </Card>
                    ) : (
                        <>
                            {/* Summary */}
                            <Card className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-900">Summary</h3>
                                {summaries.map(({ question, count, summary }) => (
                                    <div key={question.id} className="flex items-center justify-between gap-4 text-[14px]">
                                        <span className="text-gray-700 min-w-0 truncate">{question.text}</span>
                                        <span className="text-gray-400 shrink-0">
                                            {summary || (question.type === "text" ? `${count} ${count === 1 ? "reply" : "replies"}` : "—")}
                                        </span>
                                    </div>
                                ))}
                            </Card>

                            {/* Individual submissions */}
                            {filtered.map((r) => (
                                <Card key={r.id} className="p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0">
                                            <p className="text-[15px] font-bold text-gray-900 truncate">
                                                {r.restaurantName || "Unknown restaurant"}
                                                {r.branchName && <span className="font-medium text-gray-500"> · {r.branchName}</span>}
                                            </p>
                                            <p className="text-[12px] font-medium text-gray-400">{formatDate(r.submittedAt)}</p>
                                        </div>
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                aria-label="Delete response"
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                    <dl className="space-y-3">
                                        {r.answers.map((a) => (
                                            <div key={a.questionId}>
                                                <dt className="text-[13px] font-medium text-gray-500">{a.questionText}</dt>
                                                <dd className="mt-0.5 text-[15px]">
                                                    <AnswerValue answer={a} />
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </Card>
                            ))}
                        </>
                    )}
                </>
            )}
        </Page>
    );
}
