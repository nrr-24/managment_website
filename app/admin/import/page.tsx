"use client";

import { useState } from "react";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { listRestaurants, createRestaurant, createCategory, createDish, Restaurant } from "@/lib/data";

/*
  Expected JSON format:
  {
    "name": "Restaurant Name",
    "nameAr": "...",
    "themeColorHex": "#00BCD4",
    "layout": "list",
    "dishColumns": 2,
    "menuFont": "system",
    "categories": [
      {
        "name": "Appetizers",
        "nameAr": "...",
        "order": 0,
        "isActive": true,
        "availabilityStart": "09:00",  // optional
        "availabilityEnd": "17:00",    // optional
        "dishes": [
          {
            "name": "Hummus",
            "nameAr": "...",
            "description": "...",
            "descriptionAr": "...",
            "price": 2.5,
            "isActive": true,
            "allergens": [{ "name": "Sesame", "nameAr": "سمسم" }],
            "options": {
              "header": "Size",
              "headerAr": "الحجم",
              "required": true,
              "maxSelection": 1,
              "items": [
                { "name": "Small", "nameAr": "صغير", "price": 0 },
                { "name": "Large", "nameAr": "كبير", "price": 1.5 }
              ]
            }
          }
        ]
      }
    ]
  }
*/

type LogEntry = { text: string; type: "info" | "success" | "error" };

export default function ImportPage() {
    const { showToast, ToastComponent } = useToast();

    const [jsonText, setJsonText] = useState("");
    const [busy, setBusy] = useState(false);
    const [log, setLog] = useState<LogEntry[]>([]);
    const [mode, setMode] = useState<"new" | "existing">("new");
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [selectedRid, setSelectedRid] = useState<string>("");
    const [loadedRests, setLoadedRests] = useState(false);

    function addLog(text: string, type: LogEntry["type"] = "info") {
        setLog(prev => [...prev, { text, type }]);
    }

    function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            setJsonText(content);
            showToast(`Loaded ${file.name}`);
        };
        reader.readAsText(file);
    }

    async function loadRestaurants() {
        if (loadedRests) return;
        const rests = await listRestaurants();
        setRestaurants(rests);
        setLoadedRests(true);
        if (rests.length > 0) setSelectedRid(rests[0].id);
    }

    async function handleImport() {
        if (!jsonText.trim()) {
            showToast("Please paste or upload JSON data first", "error");
            return;
        }

        let data: any;
        try {
            data = JSON.parse(jsonText);
        } catch (err) {
            showToast("Invalid JSON format", "error");
            return;
        }

        if (mode === "existing" && !selectedRid) {
            showToast("Please select a restaurant", "error");
            return;
        }

        setBusy(true);
        setLog([]);

        try {
            let rid: string;

            if (mode === "new") {
                // Create the restaurant first
                addLog(`Creating restaurant "${data.name || "Untitled"}"...`);
                rid = await createRestaurant({
                    name: data.name || "Imported Restaurant",
                    nameAr: data.nameAr || "",
                    themeColorHex: data.themeColorHex || "#00ffff",
                    layout: data.layout || "list",
                    dishColumns: data.dishColumns || 2,
                    menuFont: data.menuFont || "system",
                });
                addLog(`Restaurant created with ID: ${rid}`, "success");
            } else {
                rid = selectedRid;
                addLog(`Importing into existing restaurant: ${rid}`);
            }

            // Import categories
            const categories = data.categories || [];
            addLog(`Found ${categories.length} categories to import`);

            for (let i = 0; i < categories.length; i++) {
                const cat = categories[i];
                addLog(`Creating category ${i + 1}/${categories.length}: "${cat.name}"...`);

                const cid = await createCategory(rid, {
                    name: cat.name || `Category ${i + 1}`,
                    nameAr: cat.nameAr || "",
                    order: cat.order ?? i,
                    isActive: cat.isActive !== false,
                    availabilityStart: cat.availabilityStart || null,
                    availabilityEnd: cat.availabilityEnd || null,
                });

                addLog(`Category "${cat.name}" created`, "success");

                // Import dishes within this category
                const dishes = cat.dishes || [];
                addLog(`  Found ${dishes.length} dishes in "${cat.name}"`);

                for (let j = 0; j < dishes.length; j++) {
                    const dish = dishes[j];
                    addLog(`  Creating dish ${j + 1}/${dishes.length}: "${dish.name}"...`);

                    await createDish(rid, cid, {
                        name: dish.name || `Dish ${j + 1}`,
                        nameAr: dish.nameAr || "",
                        description: dish.description || "",
                        descriptionAr: dish.descriptionAr || "",
                        price: dish.price ?? 0,
                        isActive: dish.isActive !== false,
                        allergens: dish.allergens || undefined,
                        options: dish.options || undefined,
                        imagePaths: [],
                        imageUrls: [],
                    });

                    addLog(`  Dish "${dish.name}" created`, "success");
                }
            }

            addLog(`Import complete! ${categories.length} categories with all dishes imported.`, "success");
            showToast("Import completed successfully!");
        } catch (err: any) {
            console.error("Import failed:", err);
            addLog(`Error: ${err.message || "Unknown error"}`, "error");
            showToast("Import failed. Check the log below.", "error");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Page title="Import Data" showBack={true}>
            <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Import Data</h1>
                    <p className="text-gray-400 font-medium">Upload a JSON file or paste JSON to import restaurant menu data.</p>
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-500 uppercase text-xs tracking-wider">Import Mode</span>
                    <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-full flex gap-1">
                        <button
                            onClick={() => setMode("new")}
                            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${mode === "new" ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
                        >
                            New Restaurant
                        </button>
                        <button
                            onClick={() => { setMode("existing"); loadRestaurants(); }}
                            className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all ${mode === "existing" ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
                        >
                            Existing Restaurant
                        </button>
                    </div>
                </div>

                {/* Restaurant Selector (existing mode) */}
                {mode === "existing" && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Target Restaurant</label>
                        <select
                            value={selectedRid}
                            onChange={e => setSelectedRid(e.target.value)}
                            className="w-full h-14 px-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-medium"
                        >
                            {restaurants.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* File Upload */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">JSON Data</label>
                    <input
                        type="file"
                        id="json-file"
                        className="hidden"
                        accept=".json,application/json"
                        onChange={handleFileUpload}
                    />
                    <Card
                        onClick={() => document.getElementById("json-file")?.click()}
                        className="p-6 flex flex-col items-center gap-3 rounded-3xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-[0.99] transition-all border-2 border-dashed border-gray-200 dark:border-gray-700"
                    >
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <span className="text-blue-600 font-bold text-sm">Upload JSON File</span>
                        <span className="text-gray-400 text-xs">or paste below</span>
                    </Card>

                    <textarea
                        placeholder='Paste JSON here...'
                        className="w-full h-64 px-6 py-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none font-mono text-sm resize-none focus:border-blue-500 transition-all"
                        value={jsonText}
                        onChange={e => setJsonText(e.target.value)}
                    />
                </div>

                {/* Preview */}
                {jsonText && (() => {
                    try {
                        const d = JSON.parse(jsonText);
                        const cats = d.categories || [];
                        const totalDishes = cats.reduce((sum: number, c: any) => sum + (c.dishes?.length || 0), 0);
                        return (
                            <Card className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                                <div className="text-sm font-medium text-green-700 dark:text-green-400 space-y-1">
                                    <p className="font-bold text-base">{d.name || "Unnamed Restaurant"}</p>
                                    <p>{cats.length} categories, {totalDishes} dishes</p>
                                    {d.layout && <p>Layout: {d.layout}</p>}
                                    {d.themeColorHex && (
                                        <div className="flex items-center gap-2">
                                            <span>Theme:</span>
                                            <div className="w-4 h-4 rounded" style={{ backgroundColor: d.themeColorHex }} />
                                            <span>{d.themeColorHex}</span>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    } catch {
                        return (
                            <Card className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                                <p className="text-sm font-bold text-red-600">Invalid JSON</p>
                            </Card>
                        );
                    }
                })()}

                {/* Import Button */}
                <button
                    disabled={busy || !jsonText.trim()}
                    onClick={handleImport}
                    className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-xl shadow-blue-600/10 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {busy ? "Importing..." : "Start Import"}
                </button>

                {/* Log Output */}
                {log.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Import Log</label>
                        <Card className="p-4 rounded-2xl max-h-80 overflow-y-auto">
                            <div className="space-y-1 font-mono text-xs">
                                {log.map((entry, i) => (
                                    <p key={i} className={
                                        entry.type === "success" ? "text-green-600" :
                                        entry.type === "error" ? "text-red-500" :
                                        "text-gray-500"
                                    }>
                                        {entry.type === "success" ? "✓" : entry.type === "error" ? "✗" : "→"} {entry.text}
                                    </p>
                                ))}
                                {busy && (
                                    <p className="text-blue-500 animate-pulse">Processing...</p>
                                )}
                            </div>
                        </Card>
                    </div>
                )}

                <div className="h-8" />
            </div>
            {ToastComponent}
        </Page>
    );
}
