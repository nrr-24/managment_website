/**
 * Import script: Creates a restaurant from JSON + uploads dish images from folder.
 *
 * Usage:
 *   npx tsx scripts/import-menu.ts
 *
 * Requires .env.local with Firebase config (NEXT_PUBLIC_FIREBASE_*).
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, writeBatch, doc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { config } from "dotenv";

// ── Load env ──
config({ path: resolve(__dirname, "../.env.local") });

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
    console.error("Missing Firebase config. Create .env.local with NEXT_PUBLIC_FIREBASE_* vars.");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ── Paths ──
const JSON_PATH = resolve(process.env.HOME!, "Desktop/luma*.json");
const IMAGES_DIR = resolve(process.env.HOME!, "Desktop/ELEMENT OF WATER");

// Find the JSON file (has unicode char in name)
function findJsonFile(): string {
    const desktop = resolve(process.env.HOME!, "Desktop");
    const files = readdirSync(desktop);
    const jsonFile = files.find(f => f.startsWith("luma") && f.endsWith(".json"));
    if (!jsonFile) {
        console.error("Could not find luma*.json on Desktop");
        process.exit(1);
    }
    return join(desktop, jsonFile);
}

// Generate a simple UUID
function uuid(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ── Types ──
interface JsonDish {
    id: string;
    name_en: string;
    name_ar: string;
    price: number;
    description_en: string;
    description_ar: string;
    ingredients_en: string[];
    ingredients_ar: string[];
    allergens_en: string[];
    allergens_ar: string[];
}

interface JsonCategory {
    id: string;
    name_en: string;
    name_ar: string;
    dishes: JsonDish[];
}

interface JsonMenu {
    menu: {
        id: string;
        currency: string;
        name_en: string;
        name_ar: string;
        categories: JsonCategory[];
    };
}

// ── Image matching ──
// Folder names: uppercase with spaces (e.g., "CLASSIC", "ICE & HOT")
// File names: uppercase dish name + .jpg (e.g., "CLASSIC MOJITO.jpg")
function findImageForDish(categoryName: string, dishName: string): string | null {
    const folderName = categoryName.toUpperCase();
    const folderPath = join(IMAGES_DIR, folderName);

    if (!existsSync(folderPath)) return null;

    const files = readdirSync(folderPath);
    const dishUpper = dishName.toUpperCase();

    // Try exact match first
    const exact = files.find(f => {
        const nameNoExt = f.replace(/\.\w+$/, "");
        return nameNoExt === dishUpper;
    });
    if (exact) return join(folderPath, exact);

    // Try fuzzy: remove special chars
    const normalize = (s: string) => s.replace(/[^A-Z0-9 ]/g, "").trim();
    const fuzzy = files.find(f => {
        const nameNoExt = f.replace(/\.\w+$/, "");
        return normalize(nameNoExt) === normalize(dishUpper);
    });
    if (fuzzy) return join(folderPath, fuzzy);

    return null;
}

async function uploadImage(filePath: string, storagePath: string): Promise<{ url: string; path: string }> {
    const fileData = readFileSync(filePath);
    const storageRef = ref(storage, storagePath);
    const result = await uploadBytes(storageRef, fileData, { contentType: "image/jpeg" });
    const url = await getDownloadURL(result.ref);
    return { url, path: storagePath };
}

// ── Main Import ──
async function main() {
    const jsonPath = findJsonFile();
    console.log(`Reading JSON from: ${jsonPath}`);
    const data: JsonMenu = JSON.parse(readFileSync(jsonPath, "utf-8"));
    const menu = data.menu;

    console.log(`\nMenu: ${menu.name_en} (${menu.name_ar})`);
    console.log(`Categories: ${menu.categories.length}`);
    console.log(`Total dishes: ${menu.categories.reduce((sum, c) => sum + c.dishes.length, 0)}`);
    console.log();

    // 1. Create Restaurant
    console.log("Creating restaurant...");
    const restaurantRef = await addDoc(collection(db, "restaurants"), {
        name: menu.name_en,
        nameAr: menu.name_ar,
        layout: "list",
        menuFont: "system",
        themeColorHex: "#00ffff",
        createdAt: serverTimestamp(),
    });
    const rid = restaurantRef.id;
    console.log(`  Restaurant created: ${rid}`);

    // 2. Create Categories & Dishes
    for (let catIdx = 0; catIdx < menu.categories.length; catIdx++) {
        const cat = menu.categories[catIdx];
        console.log(`\n[${catIdx + 1}/${menu.categories.length}] Creating category: ${cat.name_en}`);

        const catRef = await addDoc(collection(db, "restaurants", rid, "categories"), {
            name: cat.name_en,
            nameAr: cat.name_ar,
            isActive: true,
            sortOrder: catIdx,
            createdAt: serverTimestamp(),
        });
        const cid = catRef.id;
        console.log(`  Category created: ${cid}`);

        // Create dishes
        for (let dishIdx = 0; dishIdx < cat.dishes.length; dishIdx++) {
            const dish = cat.dishes[dishIdx];
            console.log(`  [${dishIdx + 1}/${cat.dishes.length}] ${dish.name_en} - ${dish.price} KWD`);

            // Build allergens array
            const allergens = dish.allergens_en.map((name, i) => ({
                id: uuid(),
                name,
                nameAr: dish.allergens_ar[i] || "",
            }));

            // Build description from ingredients
            const descEn = dish.ingredients_en.length > 0 ? dish.ingredients_en.join(", ") : "";
            const descAr = dish.ingredients_ar.length > 0 ? dish.ingredients_ar.join("، ") : "";

            // Check for image
            const imagePath = findImageForDish(cat.name_en, dish.name_en);
            let imagePaths: string[] = [];

            if (imagePath) {
                const batchId = uuid().split("-")[0];
                const storagePath = `dishes/${rid}/${cid}/${dish.name_en}_${batchId}_0.jpg`;
                try {
                    const { path } = await uploadImage(imagePath, storagePath);
                    imagePaths = [path];
                    console.log(`    Image uploaded: ${path}`);
                } catch (err) {
                    console.error(`    Image upload failed:`, err);
                }
            } else {
                console.log(`    No image found`);
            }

            // Create dish doc
            await addDoc(collection(db, "restaurants", rid, "categories", cid, "dishes"), {
                name: dish.name_en,
                nameAr: dish.name_ar,
                price: dish.price,
                description: descEn,
                descriptionAr: descAr,
                imagePaths,
                allergens: allergens.length > 0 ? allergens : [],
                isActive: true,
                sortOrder: dishIdx,
                // iOS-style options fields (empty)
                options: null,
                optionsHeader: null,
                optionsHeaderAr: null,
                areOptionsRequired: false,
                maxOptionsSelection: null,
                createdAt: serverTimestamp(),
            });
        }
    }

    console.log("\n\nImport complete!");
    console.log(`Restaurant ID: ${rid}`);
    console.log(`Open in admin: /admin/restaurants/${rid}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
});
