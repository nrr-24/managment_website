"use client";

import { useState, useRef } from "react";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/lib/auth";
import {
    parseImportJSON,
    validateImportMenu,
    importMenuData,
    ImportMenu,
    ImportSummary,
} from "@/lib/data";

type Phase = "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
    const { showToast, ToastComponent } = useToast();
    const { user } = useAuth();

    const [phase, setPhase] = useState<Phase>("upload");
    const [jsonText, setJsonText] = useState("");
    const [fileName, setFileName] = useState<string | null>(null);
    const [summary, setSummary] = useState<ImportSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Import progress
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    const cancelledRef = useRef(false);

    // Parse & Preview
    function handleParseAndPreview(text?: string) {
        const source = text ?? jsonText;
        if (!source.trim()) {
            showToast("Please paste or upload JSON data first", "error");
            return;
        }

        setErrorMessage(null);
        setSummary(null);

        try {
            const menu = parseImportJSON(source);
            const warnings = validateImportMenu(menu);
            const dishCount = menu.categories.reduce((sum, c) => sum + c.dishes.length, 0);

            setSummary({
                menu,
                categoryCount: menu.categories.length,
                dishCount,
                warnings,
            });
            setPhase("preview");
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to parse JSON");
            showToast("Invalid JSON format", "error");
        }
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            setJsonText(content);
            setFileName(file.name);
            showToast(`Loaded ${file.name}`);
            // Auto-parse on file load
            handleParseAndPreview(content);
        };
        reader.readAsText(file);
    }

    // Import
    async function handleStartImport() {
        if (!summary || !user?.uid) return;

        cancelledRef.current = false;
        setPhase("importing");
        setProgress(0);
        setStatusMessage("Preparing...");
        setErrorMessage(null);
        setResultMessage(null);

        try {
            const result = await importMenuData(
                summary.menu,
                user.uid,
                (completed, total, status) => {
                    if (cancelledRef.current) throw new Error("Import cancelled.");
                    setProgress(completed / total);
                    setStatusMessage(status);
                }
            );

            setProgress(1);
            setStatusMessage("");
            setResultMessage(
                `Done! ${result.categoryCount} categories, ${result.dishCount} dishes imported.`
            );
            setPhase("done");
            showToast("Import completed successfully!");
        } catch (err: any) {
            setErrorMessage(err.message || "Import failed");
            setPhase("preview");
            showToast("Import failed", "error");
        }
    }

    function handleCancel() {
        cancelledRef.current = true;
    }

    function handleReset() {
        setPhase("upload");
        setJsonText("");
        setFileName(null);
        setSummary(null);
        setErrorMessage(null);
        setProgress(0);
        setStatusMessage("");
        setResultMessage(null);
    }

    // Nav bar action
    const actions = phase === "upload" ? (
        <button
            disabled={!jsonText.trim()}
            onClick={() => handleParseAndPreview()}
            className="text-green-800 font-bold hover:opacity-70 disabled:opacity-30 transition-opacity"
        >
            Preview
        </button>
    ) : phase === "preview" ? (
        <button
            onClick={handleStartImport}
            className="text-green-800 font-bold hover:opacity-70 transition-opacity"
        >
            Import
        </button>
    ) : phase === "done" ? (
        <button
            onClick={handleReset}
            className="text-green-800 font-bold hover:opacity-70 transition-opacity"
        >
            New Import
        </button>
    ) : null;

    const leftAction = phase === "preview" ? (
        <button
            onClick={() => { setPhase("upload"); setSummary(null); setErrorMessage(null); }}
            className="text-green-800 font-medium hover:opacity-70 transition-opacity"
        >
            Back
        </button>
    ) : phase === "importing" ? (
        <button
            onClick={handleCancel}
            className="text-red-500 font-medium hover:opacity-70 transition-opacity"
        >
            Cancel
        </button>
    ) : undefined;

    return (
        <Page
            title="Import Data"
            actions={actions}
            leftAction={leftAction}
            showBack={phase === "upload"}
        >
            <div className="space-y-6 max-w-2xl mx-auto">

                {/* ─── PHASE: Upload ─── */}
                {phase === "upload" && (
                    <>
                        {/* Intro */}
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Import Menu</h2>
                            <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">
                                Upload a JSON file or paste data to import a restaurant with all its categories and dishes.
                            </p>
                        </div>

                        {/* File Upload */}
                        <section className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">JSON File</label>
                            <input
                                type="file"
                                id="json-file"
                                className="hidden"
                                accept=".json,application/json"
                                onChange={handleFileUpload}
                            />
                            <Card
                                onClick={() => document.getElementById("json-file")?.click()}
                                className="p-5 flex items-center gap-4 rounded-2xl cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all"
                            >
                                <div className="w-11 h-11 bg-green-50 text-green-700 rounded-[14px] flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-bold text-[15px] text-gray-900">
                                        {fileName || "Upload JSON File"}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {fileName ? "Tap to change file" : "Select a .json file from your device"}
                                    </p>
                                </div>
                            </Card>
                        </section>

                        {/* Paste JSON */}
                        <section className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Or Paste JSON</label>
                            <textarea
                                placeholder='{"menu": {"id": "...", "name_en": "...", "categories": [...]}}'
                                className="w-full h-40 px-5 py-4 rounded-2xl bg-white border border-gray-200/60 outline-none font-mono text-[13px] resize-none focus:border-green-800 transition-all shadow-sm"
                                value={jsonText}
                                onChange={e => setJsonText(e.target.value)}
                            />
                        </section>

                        {/* Format Hint */}
                        <Card className="p-4 rounded-2xl bg-blue-50/50 border-blue-100">
                            <p className="text-xs font-bold text-blue-700 mb-1.5">Expected Format</p>
                            <p className="text-xs text-blue-600 font-medium leading-relaxed">
                                JSON with <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">id</code>,{" "}
                                <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">name_en</code>, and{" "}
                                <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">categories</code> array.
                                Can be wrapped in a <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">{`{ "menu": {...} }`}</code> object.
                                Each category has <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">dishes</code> with optional allergens and options.
                            </p>
                        </Card>

                        {/* Error */}
                        {errorMessage && (
                            <Card className="p-4 rounded-2xl bg-red-50 border-red-200">
                                <p className="text-sm font-bold text-red-600">Error</p>
                                <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
                            </Card>
                        )}
                    </>
                )}

                {/* ─── PHASE: Preview ─── */}
                {phase === "preview" && summary && (
                    <>
                        {/* Summary Card */}
                        <Card className="p-5 rounded-2xl bg-green-50/70 border-green-200/60">
                            <div className="flex items-start gap-4">
                                <div className="w-11 h-11 bg-green-100 text-green-700 rounded-[14px] flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-green-900 truncate">
                                        {summary.menu.name_en}
                                    </h3>
                                    {summary.menu.name_ar && (
                                        <p className="text-sm text-green-700 font-medium" dir="rtl">
                                            {summary.menu.name_ar}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                            {summary.categoryCount} categories
                                        </span>
                                        <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                            {summary.dishCount} dishes
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-green-600 mt-2 font-medium">
                                        ID: {summary.menu.id}
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Warnings */}
                        {summary.warnings.length > 0 && (
                            <Card className="p-4 rounded-2xl bg-yellow-50/70 border-yellow-200/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                                    </svg>
                                    <p className="text-xs font-bold text-yellow-700 uppercase tracking-wider">
                                        {summary.warnings.length} Warning{summary.warnings.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    {summary.warnings.map((w, i) => (
                                        <p key={i} className="text-xs text-yellow-700 font-medium">• {w}</p>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Category Breakdown */}
                        <section className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 px-4 uppercase tracking-wider">Categories</label>
                            <div className="space-y-1.5">
                                {summary.menu.categories.map((cat, i) => (
                                    <Card key={cat.id} className="p-3.5 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                    {i + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-[14px] text-gray-900 truncate">
                                                        {cat.name_en}
                                                    </p>
                                                    {cat.name_ar && (
                                                        <p className="text-xs text-gray-400 font-medium truncate" dir="rtl">
                                                            {cat.name_ar}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 ml-2 flex-shrink-0">
                                                {cat.dishes.length} dish{cat.dishes.length !== 1 ? "es" : ""}
                                            </span>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </section>

                        {/* Error */}
                        {errorMessage && (
                            <Card className="p-4 rounded-2xl bg-red-50 border-red-200">
                                <p className="text-sm font-bold text-red-600">Import Failed</p>
                                <p className="text-xs text-red-500 mt-1">{errorMessage}</p>
                            </Card>
                        )}

                        {/* Info note */}
                        <p className="text-xs text-gray-400 font-medium text-center px-4">
                            Tap <span className="font-bold text-green-800">Import</span> to write this data to Firestore.
                            Existing documents with matching IDs will be merged.
                        </p>
                    </>
                )}

                {/* ─── PHASE: Importing ─── */}
                {phase === "importing" && (
                    <div className="py-12 flex flex-col items-center gap-6">
                        {/* Animated spinner */}
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                                <circle
                                    cx="40" cy="40" r="34"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="40" cy="40" r="34"
                                    fill="none"
                                    stroke="#166534"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 34}`}
                                    strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress)}`}
                                    className="transition-all duration-300"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-green-900">
                                    {Math.round(progress * 100)}%
                                </span>
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="font-bold text-gray-900 text-lg">Importing...</p>
                            <p className="text-sm text-gray-400 font-medium mt-1">{statusMessage}</p>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full max-w-xs">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-800 rounded-full transition-all duration-300"
                                    style={{ width: `${progress * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── PHASE: Done ─── */}
                {phase === "done" && (
                    <div className="py-12 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-900 text-xl">Import Complete</p>
                            <p className="text-sm text-gray-400 font-medium mt-2">{resultMessage}</p>
                        </div>

                        <button
                            onClick={handleReset}
                            className="px-6 py-3 rounded-2xl bg-green-800 text-white font-bold hover:bg-green-900 active:scale-[0.98] transition-all shadow-lg shadow-green-800/10"
                        >
                            Import Another
                        </button>
                    </div>
                )}

                <div className="h-20" />
            </div>
            {ToastComponent}
        </Page>
    );
}
