/**
 * Delete every image associated with a restaurant (dishes, categories, restaurant
 * logo/background) from Firebase Storage — including the Resize-Images-extension
 * thumbnails — and clear the matching `imagePaths` / `imagePath` fields in
 * Firestore so dishes don't render broken thumbnails.
 *
 * Usage:
 *   npx tsx scripts/wnr-image-delete-all.ts --rid=wok_n_roll --dry-run
 *   npx tsx scripts/wnr-image-delete-all.ts --rid=wok_n_roll --confirm
 *
 * Flags:
 *   --rid=<id>      Restaurant ID (defaults to looking up "Wok N Roll").
 *   --dry-run       List what would be deleted; make no writes.
 *   --confirm       Required to actually delete (without it, dry-run is forced).
 *   --keep-firestore  Only delete Storage objects; don't clear imagePaths fields.
 */

import { resolve } from "path";
import { config } from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

config({ path: resolve(__dirname, "../.env.local") });

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
// CLI
// ──────────────────────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    const rid = args.find((a) => a.startsWith("--rid="))?.split("=")[1];
    const dryRun = args.includes("--dry-run");
    const confirm = args.includes("--confirm");
    const keepFirestore = args.includes("--keep-firestore");
    const dishesOnly = args.includes("--dishes-only");
    return { rid, dryRun: dryRun || !confirm, confirm, keepFirestore, dishesOnly };
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
async function findRestaurantId(explicitRid?: string): Promise<string> {
    const db = getFirestore();
    if (explicitRid) {
        const doc = await db.collection("restaurants").doc(explicitRid).get();
        if (!doc.exists) {
            console.error(`Restaurant ${explicitRid} not found`);
            process.exit(1);
        }
        console.log(`Using restaurant: ${doc.data()?.name || "(unnamed)"} [${doc.id}]`);
        return doc.id;
    }
    const snap = await db.collection("restaurants").get();
    const candidates = snap.docs.filter((d) => {
        const name = String(d.data()?.name || "").toLowerCase();
        return name.includes("wok") && name.includes("roll");
    });
    if (candidates.length !== 1) {
        console.error(`Pass --rid=<id>. Matching restaurants:`);
        for (const d of candidates) console.error(`  - ${d.data()?.name} [${d.id}]`);
        process.exit(1);
    }
    const r = candidates[0];
    console.log(`Using restaurant: ${r.data()?.name} [${r.id}]`);
    return r.id;
}

/**
 * Storage prefixes covering everything the iOS / web upload code paths write
 * for this restaurant. The Resize Images Firebase Extension mirrors any path
 * X/Y.jpg into thumbnails/X/Y_<size>.jpg, so we list both.
 */
function prefixesFor(rid: string, dishesOnly: boolean): string[] {
    if (dishesOnly) {
        // Thumbnails for dish images live at dishes/{rid}/{cat}/thumbnails/...
        // so the dishes/{rid}/ prefix already covers them.
        return [
            `dishes/${rid}/`,
            `thumbnails/dishes/${rid}/`,  // included for safety, usually empty
        ];
    }
    return [
        `dishes/${rid}/`,
        `restaurants/${rid}/`,
        `thumbnails/dishes/${rid}/`,
        `thumbnails/restaurants/${rid}/`,
    ];
}

async function listFilesUnder(prefix: string): Promise<string[]> {
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({ prefix });
    return files.map((f) => f.name);
}

async function deleteFiles(paths: string[]): Promise<{ ok: number; failed: number }> {
    const bucket = getStorage().bucket();
    let ok = 0;
    let failed = 0;
    // Delete in modest batches to avoid burst-rate issues.
    const CONCURRENCY = 16;
    for (let i = 0; i < paths.length; i += CONCURRENCY) {
        const batch = paths.slice(i, i + CONCURRENCY);
        await Promise.all(
            batch.map(async (p) => {
                try {
                    await bucket.file(p).delete();
                    ok++;
                } catch (err: any) {
                    if (err?.code === 404) {
                        ok++; // already gone
                    } else {
                        failed++;
                        console.error(`  ✗ ${p}: ${err?.message || err}`);
                    }
                }
            }),
        );
        process.stdout.write(`\r  deleted ${ok}/${paths.length} (failed ${failed})...`);
    }
    process.stdout.write("\n");
    return { ok, failed };
}

async function clearFirestoreImagePaths(
    rid: string,
    dryRun: boolean,
    dishesOnly: boolean,
): Promise<{ touched: number }> {
    const db = getFirestore();
    let touched = 0;
    const restRef = db.collection("restaurants").doc(rid);

    if (!dishesOnly) {
        if (!dryRun) {
            await restRef.update({ imagePath: "", backgroundImagePath: "" });
        }
        touched++;
    }

    const catsSnap = await restRef.collection("categories").get();
    for (const cat of catsSnap.docs) {
        if (!dishesOnly) {
            if (!dryRun) await cat.ref.update({ imagePath: "" });
            touched++;
        }

        const dishesSnap = await cat.ref.collection("dishes").get();
        for (const dish of dishesSnap.docs) {
            if (!dryRun) await dish.ref.update({ imagePaths: [] });
            touched++;
        }
    }

    return { touched };
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────
async function main() {
    const { rid: ridFlag, dryRun, confirm, keepFirestore, dishesOnly } = parseArgs();
    initAdmin();

    const rid = await findRestaurantId(ridFlag);
    if (!confirm) {
        console.log("\n⚠️  No --confirm flag — running in dry-run mode (no writes).");
    } else {
        console.log("\n🔥 LIVE MODE — files will be deleted.");
    }
    if (dishesOnly) console.log("Scope: dish images only (restaurant logo / category icons preserved).");

    const prefixes = prefixesFor(rid, dishesOnly);
    console.log("\nScanning Storage prefixes:");
    let allPaths: string[] = [];
    for (const p of prefixes) {
        const list = await listFilesUnder(p);
        console.log(`  ${p}  →  ${list.length} files`);
        allPaths.push(...list);
    }
    // Dedupe (extension may double-list)
    allPaths = Array.from(new Set(allPaths));
    console.log(`\nTotal Storage objects to delete: ${allPaths.length}`);

    if (dryRun) {
        // Print a sample so the user can sanity-check.
        const sample = allPaths.slice(0, 20);
        for (const p of sample) console.log(`  - ${p}`);
        if (allPaths.length > sample.length) {
            console.log(`  … and ${allPaths.length - sample.length} more`);
        }
    } else if (allPaths.length > 0) {
        console.log(`\nDeleting ${allPaths.length} files...`);
        const { ok, failed } = await deleteFiles(allPaths);
        console.log(`Storage: ${ok} deleted, ${failed} failed.`);
    }

    if (keepFirestore) {
        console.log("\n--keep-firestore set — leaving Firestore image fields intact.");
    } else {
        console.log(`\n${dryRun ? "[dry-run] Would clear" : "Clearing"} Firestore image fields…`);
        const { touched } = await clearFirestoreImagePaths(rid, dryRun, dishesOnly);
        console.log(`Firestore: ${touched} documents ${dryRun ? "would be" : ""} updated.`);
    }

    if (dryRun) {
        console.log(`\nDry-run complete. Re-run with --confirm to actually delete.`);
    } else {
        console.log("\nDone.");
    }
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
