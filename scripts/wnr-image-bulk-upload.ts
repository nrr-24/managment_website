/**
 * Bulk upload "All WNR" images and attach them to existing Wok n Roll dishes.
 *
 * Stages:
 *   discover  → Find the restaurant, list categories & dishes (no writes).
 *   match     → Compute file → dish matches and print a per-category preview.
 *   upload    → Upload matched files to Storage and replace each dish's imagePaths.
 *
 * Usage:
 *   npx tsx scripts/wnr-image-bulk-upload.ts discover
 *   npx tsx scripts/wnr-image-bulk-upload.ts match
 *   npx tsx scripts/wnr-image-bulk-upload.ts upload
 *
 * Optional flags:
 *   --rid=<restaurantId>     Skip auto-detection of Wok n Roll
 *   --dry-run                For "upload": print actions but don't write
 *   --keep-old               For "upload": don't delete previous Storage images
 */

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join, resolve, basename, extname } from "path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: resolve(__dirname, "../.env.local") });

const PROJECT_ROOT = resolve(__dirname, "..");
const IMAGES_DIR = resolve(PROJECT_ROOT, "All WNR");
const RESTAURANT_NAME_HINTS = ["wok", "roll"];

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
// Helpers: name normalization & matching
// ──────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
    "the", "a", "an", "and", "of", "with", "in", "on", "to", "&",
    "wnr", "wok", "roll",
]);

// Project-specific spelling variants that the menu uses inconsistently.
// Map both directions to a single canonical token so the matcher treats them as equal.
const TOKEN_ALIASES: Record<string, string> = {
    // English spelling drift
    jullianed: "julienned",
    kewami: "kiwami",
    chopsuy: "chopsuey",
    viggie: "veggie",
    hinoiri: "hinori",
    hokaiddo: "hokkaido",
    cattarpiller: "caterpillar",
    pau: "pao",
    grenada: "greenada",
    terimasu: "tiramisu",
    perriers: "perrier",
    troppicana: "tropicana",
    hashimoto: "hashemoto",
    organoo: "organo",
    chocloteer: "choclotier",
    bod: "3bod",
    "3": "",
    zayod: "zyood",
    janero: "janeiro",
    yaku: "yaki",
    chai: "chi",
    griddle: "gridle",
    chili: "chilli",
    coriander: "corriander",
    "lover": "lovers",
    yasai: "yasai",
    ribeye: "ribeye",
    tenderloin: "tenderloin",
    katsu: "katsu",
    edamame: "edamami",
    salman: "salmon",
    salm: "salmon",
    tabban: "taban",
    tapan: "taban",
    grileed: "grilled",
    sashemi: "sashimi",
    inoki: "enoki",
    cattle: "lobster",
    // Abbreviations used in some filenames (e.g., "BLACK M SOUP", "h&s soup", "l&m")
    "h": "hot",
    "s": "sour",
    "m": "mushroom",
    "l": "lobster",
    "r": "rose",
    "j": "jackle",
};

// Domain synonyms (Japanese ↔ English). These are bidirectional.
const SYNONYM_PAIRS: [string, string][] = [
    ["akami", "tuna"],
    ["maguro", "tuna"],
    ["maguro", "akami"],
    ["shake", "salmon"],
    ["sake", "salmon"],
    ["unagi", "eel"],
    ["ebi", "shrimp"],
    ["ebi", "prawn"],
    ["kani", "crab"],
    ["tako", "octopus"],
    ["ika", "squid"],
    ["niku", "beef"],
    ["tori", "chicken"],
    ["yasai", "veggie"],
    ["yasai", "vegetable"],
    ["ramen", "noodles"],
    ["ramen", "noodle"],
    ["dumpling", "gyoza"],
];
const SYNONYMS = new Map<string, Set<string>>();
for (const [a, b] of SYNONYM_PAIRS) {
    if (!SYNONYMS.has(a)) SYNONYMS.set(a, new Set());
    if (!SYNONYMS.has(b)) SYNONYMS.set(b, new Set());
    SYNONYMS.get(a)!.add(b);
    SYNONYMS.get(b)!.add(a);
}

function applyAlias(token: string): string {
    return TOKEN_ALIASES[token] ?? token;
}

/** Lowercase, strip extension, drop parenthesised aliases. Used for compact equality. */
function normalize(name: string): string {
    let s = name.toLowerCase();
    s = s.replace(/\.[a-z0-9]+$/i, "");          // strip extension
    s = s.replace(/\([^)]*\)/g, " ");            // drop parenthesised aliases
    s = s.replace(/[^a-z0-9]+/g, " ");           // collapse non-alphanumerics
    s = s.replace(/\s+/g, " ").trim();
    return s;
}

/** No-space, no-punctuation, lowercased — collapses "o toro" vs "otoro". */
function compact(name: string): string {
    return normalize(name).replace(/\s+/g, "");
}

/**
 * Tokenise INCLUDING parens content — qualifiers like "(Shrimp)" / "(Chicken)"
 * are how the menu distinguishes near-duplicate dishes, so we need them.
 * But trailing "(2)" or single-digit duplicates are dropped.
 */
function tokens(name: string): string[] {
    let s = name.toLowerCase()
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/\(\s*\d+\s*\)/g, " ")           // drop "(2)" duplicate markers
        .replace(/[^a-z0-9]+/g, " ");
    return s.split(" ")
        .filter((t) => t.length > 0 && !STOPWORDS.has(t))
        .map(applyAlias)
        .filter((t) => t.length > 0);
}

/** Levenshtein distance — small strings only. */
function lev(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const dp = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) dp[j] = j;
    for (let i = 1; i <= a.length; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = dp[j];
            dp[j] = a[i - 1] === b[j - 1]
                ? prev
                : 1 + Math.min(prev, dp[j], dp[j - 1]);
            prev = tmp;
        }
    }
    return dp[b.length];
}

/** Returns weight in [0,1]: 1 = exact, 0.85 = synonym/typo, 0 = no match. */
function tokenMatchWeight(t1: string, t2: string): number {
    if (t1 === t2) return 1;
    if (SYNONYMS.get(t1)?.has(t2)) return 0.85;
    const minLen = Math.min(t1.length, t2.length);
    if (minLen >= 5 && lev(t1, t2) <= 1) return 0.85;
    if (minLen >= 7 && lev(t1, t2) <= 2) return 0.8;
    return 0;
}

/** Token-overlap score in [0,1]. 1 = identical normalized strings. */
function score(a: string, b: string): number {
    const na = normalize(a);
    const nb = normalize(b);
    if (!na || !nb) return 0;

    const ta = tokens(a);
    const tb = tokens(b);
    if (ta.length === 0 || tb.length === 0) return 0;

    // Greedy weighted token matching — each side's token matches at most one on the other.
    // Prefer higher-weight pairings first.
    type Pair = { i: number; j: number; w: number };
    const pairs: Pair[] = [];
    for (let i = 0; i < ta.length; i++) {
        for (let j = 0; j < tb.length; j++) {
            const w = tokenMatchWeight(ta[i], tb[j]);
            if (w > 0) pairs.push({ i, j, w });
        }
    }
    pairs.sort((x, y) => y.w - x.w);
    const usedA = new Set<number>();
    const usedB = new Set<number>();
    let weightedMatches = 0;
    let matchCount = 0;
    let hasExactToken = false;
    for (const p of pairs) {
        if (usedA.has(p.i) || usedB.has(p.j)) continue;
        usedA.add(p.i);
        usedB.add(p.j);
        weightedMatches += p.w;
        matchCount++;
        if (p.w === 1) hasExactToken = true;
    }
    const union = ta.length + tb.length - matchCount;
    const jaccard = weightedMatches / union;

    // Reject matches that rely entirely on synonyms or typos with no exact token overlap.
    // This prevents Tori Maki ↔ Chicken (Teppanyaki) and Ama Ebi ↔ Prawn (Teppanyaki).
    if (!hasExactToken) return Math.min(jaccard, 0.49);

    // Compact-form Levenshtein fallback (catches "hashimoto" vs "hashemoto").
    const ca = compact(a);
    const cb = compact(b);
    let levBonus = 0;
    if (ca && cb) {
        const d = lev(ca, cb);
        const longer = Math.max(ca.length, cb.length);
        if (d <= 1 || (longer >= 8 && d / longer <= 0.15)) levBonus = 0.4;
        else if (longer >= 6 && d <= 2) levBonus = 0.2;
    }

    let substringBonus = 0;
    if (ca && cb && (ca.includes(cb) || cb.includes(ca))) {
        const ratio = Math.min(ca.length, cb.length) / Math.max(ca.length, cb.length);
        if (ratio >= 0.5) substringBonus = 0.15;
    }

    // Bonus when all of the shorter side's tokens find a match.
    const small = ta.length <= tb.length ? ta : tb;
    const allSmallMatched = small.length > 0 && matchCount === small.length;
    const containmentBonus = allSmallMatched ? 0.1 : 0;

    // Don't clamp at 1 — keeping the raw value lets exact-token matches outrank
    // synonym/typo matches when both compute to 1.0 after clamping.
    return jaccard + levBonus + substringBonus + containmentBonus;
}

// ──────────────────────────────────────────────────────────────
// Firestore reads
// ──────────────────────────────────────────────────────────────
type DishRow = {
    id: string;
    name: string;
    nameAr?: string;
    imagePaths: string[];
};
type CategoryRow = {
    id: string;
    name: string;
    nameAr?: string;
    sortOrder: number;
    dishes: DishRow[];
};

async function findRestaurantId(explicitRid?: string): Promise<string> {
    const db = getFirestore();
    if (explicitRid) {
        const doc = await db.collection("restaurants").doc(explicitRid).get();
        if (!doc.exists) {
            console.error(`Restaurant ${explicitRid} not found`);
            process.exit(1);
        }
        const d = doc.data()!;
        console.log(`Using restaurant: ${d.name || "(unnamed)"} [${doc.id}]`);
        return doc.id;
    }
    const snap = await db.collection("restaurants").get();
    const candidates = snap.docs.filter((d) => {
        const name = String(d.data()?.name || "").toLowerCase();
        return RESTAURANT_NAME_HINTS.every((h) => name.includes(h));
    });
    if (candidates.length === 0) {
        console.error("No restaurant matching 'wok' + 'roll' found. Restaurants in DB:");
        snap.docs.forEach((d) => console.error(`  - ${d.data()?.name} [${d.id}]`));
        process.exit(1);
    }
    if (candidates.length > 1) {
        console.error("Multiple matching restaurants — pass --rid=<id>:");
        candidates.forEach((d) => console.error(`  - ${d.data()?.name} [${d.id}]`));
        process.exit(1);
    }
    const r = candidates[0];
    console.log(`Found restaurant: ${r.data()?.name} [${r.id}]`);
    return r.id;
}

async function loadMenu(rid: string): Promise<CategoryRow[]> {
    const db = getFirestore();
    const catsSnap = await db.collection("restaurants").doc(rid).collection("categories").get();
    const cats: CategoryRow[] = [];
    for (const c of catsSnap.docs) {
        const cd = c.data();
        const dishesSnap = await db
            .collection("restaurants").doc(rid)
            .collection("categories").doc(c.id)
            .collection("dishes").get();
        const dishes: DishRow[] = dishesSnap.docs.map((d) => {
            const dd = d.data();
            return {
                id: d.id,
                name: dd.name || "",
                nameAr: dd.nameAr,
                imagePaths: Array.isArray(dd.imagePaths) ? dd.imagePaths : [],
            };
        });
        cats.push({
            id: c.id,
            name: cd.name || "",
            nameAr: cd.nameAr,
            sortOrder: cd.sortOrder ?? Number.MAX_SAFE_INTEGER,
            dishes,
        });
    }
    cats.sort((a, b) => a.sortOrder - b.sortOrder);
    return cats;
}

// ──────────────────────────────────────────────────────────────
// Matching
// ──────────────────────────────────────────────────────────────
type ImageFile = { absPath: string; fileName: string };

function listImages(): ImageFile[] {
    if (!existsSync(IMAGES_DIR)) {
        console.error(`Images folder not found: ${IMAGES_DIR}`);
        process.exit(1);
    }
    return readdirSync(IMAGES_DIR)
        .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
        .filter((f) => statSync(join(IMAGES_DIR, f)).isFile())
        .map((f) => ({ absPath: join(IMAGES_DIR, f), fileName: f }));
}

type DishMatch = {
    dish: DishRow;
    category: CategoryRow;
    file?: ImageFile;
    score: number;
};

const MATCH_THRESHOLD = 0.5;

/**
 * Greedy global assignment: for each (file, dish) pair, pick the highest-scoring
 * unmatched pair until none remain. Each file maps to at most one dish.
 */
function computeMatches(cats: CategoryRow[], files: ImageFile[]): {
    perDish: Map<string, DishMatch>;
    unusedFiles: ImageFile[];
} {
    const allDishes: { dish: DishRow; category: CategoryRow }[] = [];
    for (const c of cats) for (const d of c.dishes) allDishes.push({ dish: d, category: c });

    type Pair = { fileIdx: number; dishIdx: number; s: number };
    const pairs: Pair[] = [];
    for (let fi = 0; fi < files.length; fi++) {
        for (let di = 0; di < allDishes.length; di++) {
            const s = score(files[fi].fileName, allDishes[di].dish.name);
            if (s >= MATCH_THRESHOLD) pairs.push({ fileIdx: fi, dishIdx: di, s });
        }
    }
    pairs.sort((a, b) => b.s - a.s);

    const usedFiles = new Set<number>();
    const usedDishes = new Set<number>();
    const perDish = new Map<string, DishMatch>();

    for (const p of pairs) {
        if (usedFiles.has(p.fileIdx) || usedDishes.has(p.dishIdx)) continue;
        usedFiles.add(p.fileIdx);
        usedDishes.add(p.dishIdx);
        const { dish, category } = allDishes[p.dishIdx];
        perDish.set(dish.id, { dish, category, file: files[p.fileIdx], score: p.s });
    }

    // Add unmatched dishes for the report.
    for (let di = 0; di < allDishes.length; di++) {
        if (usedDishes.has(di)) continue;
        const { dish, category } = allDishes[di];
        perDish.set(dish.id, { dish, category, score: 0 });
    }

    const unusedFiles = files.filter((_, i) => !usedFiles.has(i));
    return { perDish, unusedFiles };
}

// ──────────────────────────────────────────────────────────────
// Reporting
// ──────────────────────────────────────────────────────────────
function printReport(cats: CategoryRow[], perDish: Map<string, DishMatch>, unused: ImageFile[]) {
    let totalDishes = 0, matchedDishes = 0;
    for (const c of cats) {
        console.log(`\n── ${c.name} (${c.dishes.length} dishes) ──`);
        for (const d of c.dishes) {
            totalDishes++;
            const m = perDish.get(d.id)!;
            if (m.file) {
                matchedDishes++;
                const tag = m.score >= 0.95 ? "EXACT" : m.score >= 0.75 ? "STRONG" : "FUZZY";
                console.log(`  ✓ [${tag} ${m.score.toFixed(2)}] ${d.name}  ←  ${m.file.fileName}`);
            } else {
                console.log(`  · [no match] ${d.name}`);
            }
        }
    }
    console.log(`\nSummary: ${matchedDishes} / ${totalDishes} dishes matched.`);
    console.log(`Unused image files: ${unused.length}`);
    if (unused.length > 0) {
        for (const u of unused) console.log(`  - ${u.fileName}`);
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
    const safeDishName = dishName; // Storage path matches Swift / web convention exactly
    const storagePath = `dishes/${rid}/${cid}/${safeDishName}_${batchId}_0.jpg`;
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
        try {
            await bucket.file(p).delete();
        } catch (err: any) {
            if (err?.code !== 404) console.warn(`  warn: failed to delete ${p}: ${err?.message || err}`);
        }
    }
}

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────
function parseArgs(): { cmd: string; rid?: string; dryRun: boolean; keepOld: boolean } {
    const args = process.argv.slice(2);
    const cmd = args.find((a) => !a.startsWith("--")) || "discover";
    const rid = args.find((a) => a.startsWith("--rid="))?.split("=")[1];
    const dryRun = args.includes("--dry-run");
    const keepOld = args.includes("--keep-old");
    return { cmd, rid, dryRun, keepOld };
}

async function main() {
    const { cmd, rid: ridFlag, dryRun, keepOld } = parseArgs();
    initAdmin();

    if (cmd === "discover") {
        const rid = await findRestaurantId(ridFlag);
        const cats = await loadMenu(rid);
        console.log(`\nRestaurant: ${rid}`);
        console.log(`Categories: ${cats.length}`);
        for (const c of cats) {
            console.log(`  ${c.name} — ${c.dishes.length} dishes (current images: ${c.dishes.reduce((s, d) => s + d.imagePaths.length, 0)})`);
        }
        return;
    }

    if (cmd === "match") {
        const rid = await findRestaurantId(ridFlag);
        const cats = await loadMenu(rid);
        const files = listImages();
        console.log(`\nFound ${files.length} image files in ${IMAGES_DIR}`);
        const { perDish, unusedFiles } = computeMatches(cats, files);
        printReport(cats, perDish, unusedFiles);
        return;
    }

    if (cmd === "upload") {
        const rid = await findRestaurantId(ridFlag);
        const cats = await loadMenu(rid);
        const files = listImages();
        console.log(`\nFound ${files.length} image files in ${IMAGES_DIR}`);
        const { perDish, unusedFiles } = computeMatches(cats, files);
        printReport(cats, perDish, unusedFiles);

        const matched = [...perDish.values()].filter((m) => m.file);
        console.log(`\nAbout to ${dryRun ? "DRY-RUN" : "upload"} ${matched.length} images.`);
        if (!dryRun) console.log(keepOld ? "Old images: kept." : "Old images: will be deleted.");

        let success = 0, failed = 0;
        const db = getFirestore();
        for (const m of matched) {
            const tag = `${m.category.name} / ${m.dish.name}`;
            try {
                if (dryRun) {
                    console.log(`  [dry-run] ${tag}  ←  ${m.file!.fileName}`);
                } else {
                    const path = await uploadDishImage(rid, m.category.id, m.dish.name, m.file!);
                    if (!keepOld && m.dish.imagePaths.length > 0) {
                        await deleteOldImages(m.dish.imagePaths);
                    }
                    await db
                        .collection("restaurants").doc(rid)
                        .collection("categories").doc(m.category.id)
                        .collection("dishes").doc(m.dish.id)
                        .update({ imagePaths: [path] });
                    console.log(`  ✓ ${tag}  ←  ${m.file!.fileName}`);
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

    console.error(`Unknown command: ${cmd}. Use: discover | match | upload`);
    process.exit(1);
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
