"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { useGlobalUI } from "@/components/ui/Toast";
import { Skeleton } from "@/components/ui/Skeleton";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
    FORM_QUESTION_TYPES,
    FormQuestion,
    FormQuestionType,
    getForm,
    newFormQuestion,
    updateForm,
} from "@/lib/data";

/* ── Type dropdown (matches the design: bordered field, floating option list) ──
   The list is rendered in a portal on <body> with fixed positioning. Inside the page it
   would be trapped in its section's stacking layer (sections animate in) and the
   "Add question" button below would paint over it. */
function TypeSelect({ value, onChange }: { value: FormQuestionType; onChange: (v: FormQuestionType) => void }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    function openList() {
        const rect = triggerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const listHeight = FORM_QUESTION_TYPES.length * 44 + 14;
        const spaceBelow = window.innerHeight - rect.bottom;
        // Open upwards when there isn't room below and there is more room above
        const flip = spaceBelow < listHeight + 12 && rect.top > spaceBelow;
        setPos(
            flip
                ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 6 }
                : { left: rect.left, width: rect.width, top: rect.bottom + 6 }
        );
        setOpen(true);
    }

    useEffect(() => {
        if (!open) return;
        function onDown(e: MouseEvent) {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
            setOpen(false);
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        const close = () => setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true); // fixed position would drift from the field
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);

    const current = FORM_QUESTION_TYPES.find((t) => t.value === value);

    return (
        <div className="relative w-full sm:w-80">
            <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : openList())}
                className={`w-full h-11 px-4 flex items-center justify-between rounded-xl border bg-white text-[15px] text-gray-900 transition-colors ${
                    open ? "border-green-800 ring-2 ring-green-800/10" : "border-gray-200 hover:border-gray-300"
                }`}
            >
                <span>{current?.label}</span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {open &&
                pos &&
                createPortal(
                    <ul
                        ref={listRef}
                        role="listbox"
                        style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
                        className="z-[1000] bg-white rounded-xl shadow-xl border border-gray-100 p-1.5"
                    >
                        {FORM_QUESTION_TYPES.map((t) => (
                            <li key={t.value} role="option" aria-selected={t.value === value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(t.value);
                                        setOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-lg text-[15px] transition-colors ${
                                        t.value === value ? "bg-green-50 text-green-900 font-semibold" : "text-gray-800 hover:bg-gray-50"
                                    }`}
                                >
                                    {t.label}
                                </button>
                            </li>
                        ))}
                    </ul>,
                    document.body
                )}
        </div>
    );
}

/* ── One question card ── */
function SortableQuestion({
    question,
    index,
    canDelete,
    onChange,
    onDelete,
}: {
    question: FormQuestion;
    index: number;
    canDelete: boolean;
    onChange: (patch: Partial<FormQuestion>) => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? ("relative" as const) : undefined,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div
                className={`bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 flex items-start gap-2 sm:gap-3 ${
                    isDragging ? "shadow-xl ring-2 ring-green-800/20" : ""
                }`}
            >
                {/* Drag handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="self-center p-2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
                    aria-label={`Drag to reorder question ${index + 1}`}
                >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                    </svg>
                </button>

                <div className="flex-1 min-w-0">
                    <label htmlFor={`q-${question.id}`} className="block text-[15px] font-medium text-gray-900 mb-1.5">
                        Question {index + 1}
                    </label>
                    <input
                        id={`q-${question.id}`}
                        value={question.text}
                        onChange={(e) => onChange({ text: e.target.value })}
                        placeholder="Type your question…"
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all"
                    />

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                        <TypeSelect value={question.type} onChange={(type) => onChange({ type })} />
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={question.required}
                                onChange={(e) => onChange({ required: e.target.checked })}
                                className="w-5 h-5 rounded-md border-gray-300 accent-green-800 cursor-pointer"
                            />
                            <span className="text-[15px] text-gray-900">Required</span>
                        </label>
                    </div>
                </div>

                {/* Delete */}
                <button
                    type="button"
                    onClick={onDelete}
                    disabled={!canDelete}
                    aria-label={`Delete question ${index + 1}`}
                    title={canDelete ? "Delete question" : "A form needs at least one question"}
                    className="self-center p-2.5 text-gray-700 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-700 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default function FormBuilderPage() {
    const { fid } = useParams<{ fid: string }>();
    const { toast } = useGlobalUI();

    const [loaded, setLoaded] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);

    const [title, setTitle] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [questions, setQuestions] = useState<FormQuestion[]>([]);
    const [savedSnapshot, setSavedSnapshot] = useState("");

    const snapshot = useMemo(() => JSON.stringify({ title, isActive, questions }), [title, isActive, questions]);
    const dirty = loaded && snapshot !== savedSnapshot;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        getForm(fid)
            .then((f) => {
                if (!f) {
                    setNotFound(true);
                } else {
                    const qs = f.questions.length ? f.questions : [newFormQuestion()];
                    setTitle(f.title);
                    setIsActive(f.isActive === true);
                    setQuestions(qs);
                    setSavedSnapshot(JSON.stringify({ title: f.title, isActive: f.isActive === true, questions: qs }));
                }
            })
            .catch(() => toast("Failed to load form", "error"))
            .finally(() => setLoaded(true));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fid]);

    // Warn before closing the tab with unsaved changes
    useEffect(() => {
        if (!dirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    function patchQuestion(id: string, patch: Partial<FormQuestion>) {
        setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setQuestions((qs) => {
            const from = qs.findIndex((q) => q.id === active.id);
            const to = qs.findIndex((q) => q.id === over.id);
            return from < 0 || to < 0 ? qs : arrayMove(qs, from, to);
        });
    }

    async function handleSave() {
        if (!title.trim()) {
            toast("Give your form a title", "error");
            return;
        }
        const emptyAt = questions.findIndex((q) => !q.text.trim());
        if (emptyAt >= 0) {
            toast(`Question ${emptyAt + 1} is empty`, "error");
            document.getElementById(`q-${questions[emptyAt].id}`)?.focus();
            return;
        }
        setSaving(true);
        try {
            const cleaned = questions.map((q) => ({ ...q, text: q.text.trim() }));
            await updateForm(fid, { title: title.trim(), isActive, questions: cleaned });
            setTitle(title.trim());
            setQuestions(cleaned);
            setSavedSnapshot(JSON.stringify({ title: title.trim(), isActive, questions: cleaned }));
            toast("Form saved");
        } catch {
            toast("Failed to save form", "error");
        }
        setSaving(false);
    }

    const crumbs = [
        { label: "Feedback", href: "/admin/feedback" },
        { label: title || "Form" },
    ];

    const actions = (
        <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>
            Save
        </Button>
    );

    if (!loaded) {
        return (
            <Page title="Form" backPath="/admin/feedback" breadcrumbs={crumbs}>
                <div className="space-y-4">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </Page>
        );
    }

    if (notFound) {
        return (
            <Page title="Form" backPath="/admin/feedback" breadcrumbs={crumbs}>
                <p className="text-center text-gray-400 py-16">This form no longer exists.</p>
            </Page>
        );
    }

    return (
        <Page title={title || "Form"} actions={actions} backPath="/admin/feedback" breadcrumbs={crumbs} maxWidth="max-w-4xl">
            {/* Form settings */}
            <div className="bg-white rounded-2xl border border-gray-200/60 p-4 sm:p-5 space-y-4">
                <div>
                    <label htmlFor="form-title" className="block text-[13px] font-medium text-gray-500 mb-1.5">Form title</label>
                    <input
                        id="form-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Customer Feedback"
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-[15px] font-semibold text-gray-900 placeholder:text-gray-300 outline-none focus:border-green-800 focus:ring-2 focus:ring-green-800/10 transition-all"
                    />
                </div>
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[15px] font-medium text-gray-900">Show in the app</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">When on, customers can fill out this form from the restaurant picker screen.</p>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        aria-label="Show this form in the app"
                        onClick={() => setIsActive((v) => !v)}
                        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${isActive ? "bg-green-800" : "bg-gray-200"}`}
                    >
                        <span className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-[2px] transition-all ${isActive ? "left-[22px]" : "left-[2px]"}`} />
                    </button>
                </div>
            </div>

            {/* Questions */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {questions.map((q, i) => (
                            <SortableQuestion
                                key={q.id}
                                question={q}
                                index={i}
                                canDelete={questions.length > 1}
                                onChange={(patch) => patchQuestion(q.id, patch)}
                                onDelete={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <button
                type="button"
                onClick={() => setQuestions((qs) => [...qs, newFormQuestion()])}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-gray-300 text-gray-500 font-semibold hover:border-green-800 hover:text-green-800 hover:bg-green-50/40 transition-colors flex items-center justify-center gap-2"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add question
            </button>

            <Link
                href={`/admin/feedback/${fid}/responses`}
                className="block text-center text-sm font-semibold text-green-800 hover:underline py-2"
            >
                View responses →
            </Link>
        </Page>
    );
}
