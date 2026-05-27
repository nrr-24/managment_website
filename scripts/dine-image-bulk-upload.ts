/**
 * Bulk upload images for the Dine restaurant.
 *
 * Walks ~/Downloads/DINE MENU recursively. Each subfolder is a hint about which
 * menu category(ies) the photos likely belong to — when an image's filename
 * matches a dish in one of the hinted categories, that match wins. Otherwise
 * we fall back to global matching across every category.
 *
 * Some folders (Sweets, Summer To Winter) intentionally double-target two
 * menu categories (e.g. Breakfast + Sweet Heart) because the same dish names
 * exist in both — those images get uploaded to BOTH matching dishes.
 *
 * Stages:
 *   match     → Print per-image plan (no writes).
 *   upload    → Upload + replace dish.imagePaths.
 *
 * Usage:
 *   npx tsx scripts/dine-image-bulk-upload.ts match
 *   npx tsx scripts/dine-image-bulk-upload.ts upload [--dry-run] [--keep-old]
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve, extname } from "path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: resolve(__dirname, "../.env.local") });

const RESTAURANT_ID = "dine";
const IMAGES_ROOT = resolve(process.env.HOME!, "Downloads/DINE MENU");

// ──────────────────────────────────────────────────────────────
// Folder → preferred menu categories. "*" allows global matching.
// First-listed category gets a small bonus on ties.
// ──────────────────────────────────────────────────────────────
const FOLDER_TO_CATEGORIES: Record<string, string[]> = {
    "Magic Carpet Flatbread": ["Breakfast"],
    "Basket Of Breads":       ["Breakfast"],
    "Cheeeeese":              ["Breakfast"],
    "Gud Morning Sets":       ["Breakfast"],
    "Egg Of The Day":         ["Breakfast"],
    "Dip & Hamsa":            ["Breakfast"],
    "Fried With Friends":     ["Breakfast"],
    "Get Ready To Start":     ["Get Ready To Start"],
    "Appetizer":              ["Get Ready To Start"],
    "Pasta":                  ["Pasta With Love"],
    "Under The Sea":          ["Under The Sea"],
    "Soups":                  ["Soup Of The Day"],
    "Salad":                  ["How To Salad"],
    "Main Courses":           ["Home Sweet Home", "Here & There"],
    "Sweets":                 ["Sweet Heart", "Breakfast"],         // dup-target
    "Summer To Winter":       ["Summer To Winter", "Breakfast"],    // dup-target
    "Other Items":            ["In Between", "Under The Sea", "Here & There"],
    "NEw Pic 2023":           ["*"],
    "New folder":             ["*"],
    "Mini Poslavu Only":      ["Breakfast"],   // breakfast set ingredients
    "Breakfast":              ["Breakfast"],
};

const DUPLICATE_TARGET_FOLDERS = new Set(["Sweets", "Summer To Winter"]);

// ──────────────────────────────────────────────────────────────
// Firebase Admin init
// ──────────────────────────────────────────────────────────────
function initAdmin() {
    if (getApps().length > 0) return;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
        console.error("Missing Firebase admin credentials in .env.local");
        process.exit(1);
    }
    initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        storageBucket,
    });
}

// ──────────────────────────────────────────────────────────────
// Name normalization & matching (lifted from wnr script + extended)
// ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set(["the", "a", "an", "and", "of", "with", "in", "on", "to", "&"]);

const TOKEN_ALIASES: Record<string, string> = {
    // spelling drift
    kibbeh: "kebbeh",
    kebbeh: "kebbeh",
    kabab: "kebab",
    kabbab: "kebab",
    kebab: "kebab",
    mutabbal: "motabal",
    mtabal: "motabal",
    motabbal: "motabal",
    ghanouj: "ghanoj",
    ghanough: "ghanoj",
    moshakal: "moshakal",
    bathenjania: "eggplant",
    bathenjaniya: "eggplant",
    maqloba: "maqluba",
    maqlooba: "maqluba",
    tahjeen: "tahjen",
    bamiya: "bamia",
    tabbouleh: "taboula",
    taboule: "taboula",
    tabbouli: "taboula",
    khashkhash: "khesh",
    jiban: "eljibn",
    jibn: "eljibn",
    eljibin: "eljibn",
    eljibn: "eljibn",
    halawet: "halawet",
    machboos: "machboos",
    laban: "laban",
    "em'mu": "emmu",
    emmu: "emmu",
    pesto: "pesto",
    flatbread: "flat",
    walaba: "warag",
    leaves: "warag",
    vine: "warag",
    little: "little",
    eggplant: "eggplant",
    aubergine: "eggplant",
    plum: "plum",
    smoked: "smoked",
    smoke: "smoked",
    brisket: "brisket",
    pigeon: "pigeon",
    balool: "pigeon",
    pasta: "pasta",
    iskandrani: "iskandrani",
    iskandarani: "iskandrani",
    musakhan: "musakhan",
    bombay: "bombay",
    soujok: "soujok",
    sojok: "soujok",
    sujuk: "soujok",
    chocolate: "chocolate",
    cookies: "cookies",
    cookie: "cookies",
    halloumi: "halloumi",
    halloum: "halloumi",
    haloum: "halloumi",
    arayes: "arayes",
    arays: "arayes",
    sambosa: "sambosa",
    samosa: "sambosa",
    sambousa: "sambosa",
    samboosa: "sambosa",
    fattah: "fattah",
    fatteh: "fattah",
    creamy: "cream",
    crispy: "crispy",
    bakora: "bakora",
    orook: "orook",
    arouk: "orook",
    chizu: "chizu",
    cheesecake: "cheese",
    bakora2: "bakora",
};

const SYNONYM_PAIRS: [string, string][] = [
    ["shrimp", "prawn"],
    ["ebi", "shrimp"],
    ["ebi", "prawn"],
    ["zubaidi", "seabass"], // pomfret ≈ sea bass for matching purposes
    ["jiban", "eljibn"],
    ["balool", "pigeon"],
    ["smash", "iskandar"],
    ["yogurt", "laban"],
    ["egg", "eja"],
];
const SYNONYMS = new Map<string, Set<string>>();
for (const [a, b] of SYNONYM_PAIRS) {
    if (!SYNONYMS.has(a)) SYNONYMS.set(a, new Set());
    if (!SYNONYMS.has(b)) SYNONYMS.set(b, new Set());
    SYNONYMS.get(a)!.add(b);
    SYNONYMS.get(b)!.add(a);
}

const applyAlias = (t: string) => TOKEN_ALIASES[t] ?? t;

function normalize(name: string): string {
    let s = name.toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/\([^)]*\)/g, " ")
        .replace(/[^a-z0-9]+/g, " ");
    return s.replace(/\s+/g, " ").trim();
}
const compact = (n: string) => normalize(n).replace(/\s+/g, "");

function tokens(name: string): string[] {
    return name.toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/\(\s*\d+\s*\)/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter((t) => t.length > 0 && !STOPWORDS.has(t))
        .map(applyAlias)
        .filter((t) => t.length > 0);
}

function lev(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0]; dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = dp[j];
            dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
            prev = tmp;
        }
    }
    return dp[b.length];
}

function tokenWeight(t1: string, t2: string): number {
    if (t1 === t2) return 1;
    if (SYNONYMS.get(t1)?.has(t2)) return 0.85;
    const min = Math.min(t1.length, t2.length);
    if (min >= 5 && lev(t1, t2) <= 1) return 0.85;
    if (min >= 7 && lev(t1, t2) <= 2) return 0.8;
    return 0;
}

function score(a: string, b: string): number {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return 0;

    const ta = tokens(a);
    const tb = tokens(b);
    if (!ta.length || !tb.length) return 0;

    type P = { i: number; j: number; w: number };
    const pairs: P[] = [];
    for (let i = 0; i < ta.length; i++) {
        for (let j = 0; j < tb.length; j++) {
            const w = tokenWeight(ta[i], tb[j]);
            if (w > 0) pairs.push({ i, j, w });
        }
    }
    pairs.sort((x, y) => y.w - x.w);

    const usedA = new Set<number>(), usedB = new Set<number>();
    let weighted = 0, count = 0, hasExact = false;
    for (const p of pairs) {
        if (usedA.has(p.i) || usedB.has(p.j)) continue;
        usedA.add(p.i); usedB.add(p.j);
        weighted += p.w; count++;
        if (p.w === 1) hasExact = true;
    }
    const union = ta.length + tb.length - count;
    const jaccard = weighted / union;
    if (!hasExact) return Math.min(jaccard, 0.49);

    const ca = compact(a), cb = compact(b);
    let levBonus = 0;
    if (ca && cb) {
        const d = lev(ca, cb);
        const longer = Math.max(ca.length, cb.length);
        if (d <= 1 || (longer >= 8 && d / longer <= 0.15)) levBonus = 0.4;
        else if (longer >= 6 && d <= 2) levBonus = 0.2;
    }
    let subBonus = 0;
    if (ca && cb && (ca.includes(cb) || cb.includes(ca))) {
        const ratio = Math.min(ca.length, cb.length) / Math.max(ca.length, cb.length);
        if (ratio >= 0.5) subBonus = 0.15;
    }
    const small = ta.length <= tb.length ? ta : tb;
    const containBonus = small.length > 0 && count === small.length ? 0.1 : 0;

    return jaccard + levBonus + subBonus + containBonus;
}

// ──────────────────────────────────────────────────────────────
// Firestore reads
// ──────────────────────────────────────────────────────────────
type DishRow = { id: string; name: string; imagePaths: string[] };
type CategoryRow = { id: string; name: string; sortOrder: number; dishes: DishRow[] };

async function loadMenu(rid: string): Promise<CategoryRow[]> {
    const db = getFirestore();
    const cats = await db.collection("restaurants").doc(rid).collection("categories").get();
    const out: CategoryRow[] = [];
    for (const c of cats.docs) {
        const dishes = await db
            .collection("restaurants").doc(rid)
            .collection("categories").doc(c.id)
            .collection("dishes").get();
        out.push({
            id: c.id,
            name: c.data().name || "",
            sortOrder: c.data().sortOrder ?? 999,
            dishes: dishes.docs.map((d) => ({
                id: d.id,
                name: d.data().name || "",
                imagePaths: Array.isArray(d.data().imagePaths) ? d.data().imagePaths : [],
            })),
        });
    }
    out.sort((a, b) => a.sortOrder - b.sortOrder);
    return out;
}

// ──────────────────────────────────────────────────────────────
// Image walking
// ──────────────────────────────────────────────────────────────
type ImageFile = {
    absPath: string;
    fileName: string;
    /** Top-level subfolder name under DINE MENU/ (the category hint). */
    folderHint: string;
};

function walkImages(root: string): ImageFile[] {
    const out: ImageFile[] = [];
    function recurse(dir: string, hint: string) {
        for (const entry of readdirSync(dir)) {
            const p = join(dir, entry);
            const s = statSync(p);
            if (s.isDirectory()) {
                // Use the deepest known folder name as the hint (deeper folders override).
                const newHint = FOLDER_TO_CATEGORIES[entry] ? entry : hint;
                recurse(p, newHint);
            } else if (s.isFile() && /\.(jpe?g|png|webp)$/i.test(entry)) {
                out.push({ absPath: p, fileName: entry, folderHint: hint });
            }
        }
    }
    for (const entry of readdirSync(root)) {
        const p = join(root, entry);
        if (statSync(p).isDirectory()) recurse(p, entry);
    }
    return out;
}

// ──────────────────────────────────────────────────────────────
// Matching
// ──────────────────────────────────────────────────────────────
const MATCH_THRESHOLD = 0.5;

type Assignment = { category: CategoryRow; dish: DishRow; file: ImageFile; score: number };

/**
 * Dish-centric matching: for every (category, dish) pair, find the best file.
 * The same file may be reused for multiple dishes (e.g. Get Ready To Start /
 * Meat Kebbeh and Breakfast / Meat Kebbeh share the same source image).
 *
 * The folder hint provides a strong boost for category alignment:
 *   - in primary preferred category:    +0.5
 *   - in secondary preferred category:  +0.3
 *   - in any other allowed category:    +0.2
 *   - global (* allowed) folder:        +0.05
 *   - off-hint (folder doesn't list cat): -0.4
 */
function matchAll(cats: CategoryRow[], files: ImageFile[]): {
    assignments: Assignment[];
    unusedFiles: ImageFile[];
    unmatchedDishes: { category: CategoryRow; dish: DishRow }[];
} {
    const assignments: Assignment[] = [];
    const usedFiles = new Set<string>();
    const unmatchedDishes: { category: CategoryRow; dish: DishRow }[] = [];

    for (const cat of cats) {
        for (const dish of cat.dishes) {
            let best: Assignment | null = null;
            for (const f of files) {
                const baseScore = score(f.fileName, dish.name);
                if (baseScore < MATCH_THRESHOLD) continue;

                const allowed = FOLDER_TO_CATEGORIES[f.folderHint] || ["*"];
                const allowAll = allowed.includes("*");

                let boost = 0;
                if (allowAll) {
                    boost = 0.05;
                } else {
                    const idx = allowed.indexOf(cat.name);
                    if (idx === 0) boost = 0.5;
                    else if (idx === 1) boost = 0.3;
                    else if (idx > 1) boost = 0.2;
                    else boost = -0.4; // category not in folder's allowed list
                }

                const total = baseScore + boost;
                if (!best || total > best.score) {
                    best = { category: cat, dish, file: f, score: total };
                }
            }
            if (best) {
                assignments.push(best);
                usedFiles.add(best.file.absPath);
            } else {
                unmatchedDishes.push({ category: cat, dish });
            }
        }
    }

    const unusedFiles = files.filter((f) => !usedFiles.has(f.absPath));
    return { assignments, unusedFiles, unmatchedDishes };
}

// ──────────────────────────────────────────────────────────────
// Reporting
// ──────────────────────────────────────────────────────────────
function printReport(
    assignments: Assignment[],
    unused: ImageFile[],
    unmatched: { category: CategoryRow; dish: DishRow }[],
) {
    const byCat = new Map<string, Assignment[]>();
    for (const a of assignments) {
        if (!byCat.has(a.category.name)) byCat.set(a.category.name, []);
        byCat.get(a.category.name)!.push(a);
    }
    for (const [cat, list] of byCat) {
        console.log(`\n── ${cat} (${list.length} matches) ──`);
        list.sort((a, b) => a.dish.name.localeCompare(b.dish.name));
        for (const a of list) {
            const tag = a.score >= 1.5 ? "EXACT" : a.score >= 1 ? "STRONG" : "FUZZY";
            console.log(`  ✓ [${tag} ${a.score.toFixed(2)}] ${a.dish.name}  ←  ${a.file.folderHint}/${a.file.fileName}`);
        }
    }
    console.log(`\nDish uploads planned: ${assignments.length}`);
    console.log(`Unmatched dishes: ${unmatched.length}`);
    if (unmatched.length > 0) {
        for (const { category, dish } of unmatched) {
            console.log(`  · ${category.name} / ${dish.name}`);
        }
    }
    console.log(`\nUnused files: ${unused.length}`);
    if (unused.length > 0) {
        for (const u of unused) console.log(`  - ${u.folderHint}/${u.fileName}`);
    }
}

// ──────────────────────────────────────────────────────────────
// Upload
// ──────────────────────────────────────────────────────────────
function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

async function uploadDishImage(
    rid: string,
    cid: string,
    dishName: string,
    file: ImageFile,
): Promise<string> {
    const bucket = getStorage().bucket();
    const batchId = uuid().replace(/-/g, "").slice(0, 16).toUpperCase();
    const storagePath = `dishes/${rid}/${cid}/${dishName}_${batchId}_0.jpg`;
    await bucket.upload(file.absPath, {
        destination: storagePath,
        metadata: {
            contentType: extname(file.fileName).toLowerCase() === ".png" ? "image/png" : "image/jpeg",
            cacheControl: "public, max-age=3600",
        },
    });
    return storagePath;
}

async function deleteOldImages(paths: string[]) {
    const bucket = getStorage().bucket();
    for (const p of paths) {
        if (!p || /^https?:\/\//i.test(p)) continue;
        try { await bucket.file(p).delete(); } catch (err: any) {
            if (err?.code !== 404) console.warn(`  warn: ${p}: ${err?.message || err}`);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────
function parseArgs() {
    const a = process.argv.slice(2);
    const cmd = a.find((x) => !x.startsWith("--")) || "match";
    return {
        cmd,
        dryRun: a.includes("--dry-run"),
        keepOld: a.includes("--keep-old"),
    };
}

async function main() {
    const { cmd, dryRun, keepOld } = parseArgs();
    initAdmin();

    if (!existsSync(IMAGES_ROOT)) {
        console.error(`Images folder not found: ${IMAGES_ROOT}`);
        process.exit(1);
    }
    const cats = await loadMenu(RESTAURANT_ID);
    const files = walkImages(IMAGES_ROOT);
    console.log(`Restaurant: ${RESTAURANT_ID}`);
    console.log(`Categories: ${cats.length}`);
    console.log(`Images found: ${files.length}`);

    const { assignments, unusedFiles, unmatchedDishes } = matchAll(cats, files);

    if (cmd === "match") {
        printReport(assignments, unusedFiles, unmatchedDishes);
        return;
    }

    if (cmd === "upload") {
        printReport(assignments, unusedFiles, unmatchedDishes);
        console.log(`\n${dryRun ? "DRY-RUN" : "LIVE"} — ${assignments.length} uploads.`);

        const db = getFirestore();
        let success = 0, failed = 0;
        for (const a of assignments) {
            const tag = `${a.category.name} / ${a.dish.name}`;
            try {
                if (dryRun) {
                    console.log(`  [dry-run] ${tag}  ←  ${a.file.fileName}`);
                } else {
                    const path = await uploadDishImage(RESTAURANT_ID, a.category.id, a.dish.name, a.file);
                    if (!keepOld && a.dish.imagePaths.length > 0) {
                        await deleteOldImages(a.dish.imagePaths);
                    }
                    await db
                        .collection("restaurants").doc(RESTAURANT_ID)
                        .collection("categories").doc(a.category.id)
                        .collection("dishes").doc(a.dish.id)
                        .update({ imagePaths: [path] });
                    console.log(`  ✓ ${tag}  ←  ${a.file.fileName}`);
                }
                success++;
            } catch (err: any) {
                failed++;
                console.error(`  ✗ ${tag}: ${err?.message || err}`);
            }
        }
        console.log(`\nDone. ${success} succeeded, ${failed} failed.`);
        return;
    }

    console.error(`Unknown command: ${cmd}. Use: match | upload`);
    process.exit(1);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
