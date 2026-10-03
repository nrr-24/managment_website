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
    getRestaurant,
    listFormResponses,
} from "@/lib/data";

const SMILEYS = ["😞", "🙁", "😐", "🙂", "😄"];

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

export default function ResponsesPage() {
    const { rid, fid } = useParams<{ rid: string; fid: string }>();
    const { toast, confirm } = useGlobalUI();
    const { canDelete } = useAuth();

    const [restaurantName, setRestaurantName] = useState("");
    const [form, setForm] = useState<FeedbackForm | null>(null);
    const [responses, setResponses] = useState<FormResponse[]>([]);
    const [loaded, setLoaded] = useState(false);

    async function refresh() {
        try {
            const [f, r] = await Promise.all([getForm(rid, fid), listFormResponses(rid, fid)]);
            setForm(f);
            setResponses(r);
        } catch {
            toast("Failed to load responses", "error");
        }
        setLoaded(true);
    }

    useEffect(() => {
        getRestaurant(rid).then((r) => r && setRestaurantName(r.name || ""));
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rid, fid]);

    // Per-question summary, in the form's current question order
    const summaries = useMemo(() => {
        if (!form) return [];
        return form.questions.map((q) => {
            const answers = responses
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
    }, [form, responses]);

    async function handleDelete(id: string) {
        const ok = await confirm({ title: "Delete Response", message: "Delete this response? This cannot be undone.", destructive: true });
        if (!ok) return;
        try {
            await deleteFormResponse(rid, fid, id);
            setResponses((rs) => rs.filter((r) => r.id !== id));
            toast("Response deleted");
        } catch {
            toast("Failed to delete response", "error");
        }
    }

    const title = form?.title ? `${form.title} · Responses` : "Responses";

    return (
        <Page
            title={title}
            backPath={`/admin/restaurants/${rid}/forms/${fid}`}
            maxWidth="max-w-4xl"
            breadcrumbs={[
                { label: "Restaurants", href: "/admin/restaurants" },
                { label: restaurantName || "Restaurant", href: `/admin/restaurants/${rid}` },
                { label: "Feedback", href: `/admin/restaurants/${rid}/forms` },
                { label: form?.title || "Form", href: `/admin/restaurants/${rid}/forms/${fid}` },
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
                    <div className="flex items-baseline justify-between px-1">
                        <h2 className="text-2xl font-bold">{responses.length} response{responses.length === 1 ? "" : "s"}</h2>
                    </div>

                    {responses.length === 0 ? (
                        <Card className="text-center py-12">
                            <p className="font-semibold text-gray-900 mb-1">No responses yet</p>
                            <p className="text-sm text-gray-400">
                                {form?.isActive ? "Customers haven't submitted this form yet." : "Turn on “Show in the app” so customers can fill this out."}
                            </p>
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
                            {responses.map((r) => (
                                <Card key={r.id} className="p-4 sm:p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[12px] font-medium text-gray-400">{formatDate(r.submittedAt)}</span>
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(r.id)}
                                                aria-label="Delete response"
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
