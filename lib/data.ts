import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from "firebase/storage";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, storage } from "./firebase";
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Helper to remove undefined values recursively (Firestore doesn't accept undefined)
function cleanData(data: any): any {
    if (data === null || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => cleanData(item));

    const cleaned: any = {};
    for (const key in data) {
        if (data[key] !== undefined) {
            cleaned[key] = cleanData(data[key]);
        }
    }
    return cleaned;
}

/*
 * ──────────────────────────────────────────────────────────────────────
 *  Image Upload Specifications (must match iOS app)
 * ──────────────────────────────────────────────────────────────────────
 *  Type              │ Ideal Size       │ Format │ Max Dim │ Quality │ Storage Path
 *  ──────────────────┼──────────────────┼────────┼─────────┼─────────┼─────────────────────────────────────────────
 *  Restaurant Logo   │ 1024 x 1024      │ PNG    │ 1024    │ 0.8     │ restaurants/{rid}/logo_{uuid}.png
 *  Restaurant BG     │ 2048 x 2048      │ JPEG   │ 2048    │ 0.6     │ restaurants/{rid}/background_{uuid}.jpg
 *  Category Icon     │ 1384 x 820       │ JPEG   │ 1024    │ 0.8     │ restaurants/{rid}/categories/{cid}/icon.jpg
 *  Dish Photo        │ 2048 x 1536      │ JPEG   │ 2048    │ 0.6     │ dishes/{rid}/{cid}/{did}/{batchID}_{index}.jpg
 *  User Background   │ 2048 x 2048      │ JPEG   │ 2048    │ 0.6     │ users/{uid}/background_{uuid}.jpg
 *  ──────────────────┴──────────────────┴────────┴─────────┴─────────┴─────────────────────────────────────────────
 *  Constraints: Max 10 MB per image, max 6 dish photos per dish.
 *
 *  Firestore: restaurants/{rid}/categories/{cid}/dishes/{did}
 *  All content is bilingual (English + Arabic).
 * ──────────────────────────────────────────────────────────────────────
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Resizes and compresses an image before upload.
 * Mimics Swift's resized(maxDimension:) and jpegData(compressionQuality:).
 * Throws if the file exceeds 10 MB.
 */
async function processImage(file: File, maxDimension: number, quality: number): Promise<Blob> {
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`);
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDimension) {
                        height *= maxDimension / width;
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width *= maxDimension / height;
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("Canvas toBlob failed"));
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/** Generate an uppercase UUID, matching iOS's UUID().uuidString format. */
function generateUUID(): string {
    return crypto.randomUUID().toUpperCase();
}

export type Allergen = {
    id: string;
    name: string;
    nameAr?: string;
};

export type Restaurant = {
    id: string;
    name: string;
    nameAr?: string;
    logo?: string;
    logoPath?: string;
    backgroundImage?: string;
    backgroundImagePath?: string;
    imagePath?: string;
    themeColorHex?: string;
    layout?: string;
    dishColumns?: number;
    menuFont?: string;
    createdAt?: any;
    updatedAt?: any;
};

export type Category = {
    id: string;
    name: string;
    nameAr?: string;
    order?: number;
    imagePath?: string;
    imageUrl?: string;
    isActive?: boolean;
    availabilityStart?: string;
    availabilityEnd?: string;
};

export type DishAllergen = {
    id?: string;  // UUID — set by iOS, optional on web
    name: string;
    nameAr?: string;
};

export type DishOption = {
    id?: string;  // UUID — set by iOS, optional on web
    name: string;
    nameAr?: string;
    price?: number;
};

export type Dish = {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    price?: number;
    imagePaths?: string[];
    allergens?: DishAllergen[];
    isActive?: boolean;
    createdAt?: any;
    updatedAt?: any;

    // Normalized options (web format)
    options?: {
        header: string;
        headerAr?: string;
        required?: boolean;
        maxSelection?: number;
        items: DishOption[];
    };

    // iOS stores options differently — these fields are normalized
    // into `options` above by normalizeDish() when reading from Firestore:
    //   optionsHeader?, optionsHeaderAr?, areOptionsRequired?, maxOptionsSelection?
    //   options[] (as array of DishOption items)
};

/**
 * Normalize a raw Firestore dish document to the web Dish type.
 *
 * iOS schema uses separate top-level fields for options:
 *   optionsHeader, optionsHeaderAr, areOptionsRequired, maxOptionsSelection,
 *   options[] (array of {id, name, nameAr, price})
 *
 * Web normalizes these into a single `options` object:
 *   options: { header, headerAr, required, maxSelection, items[] }
 */
function normalizeDish(raw: any): Dish {
    const dish: Dish = { ...raw };

    // Normalize options: iOS stores as separate top-level fields + options as array of items.
    // Options can exist even when optionsHeader is null.
    const hasIosOptions = raw.optionsHeader !== undefined || raw.areOptionsRequired !== undefined || Array.isArray(raw.options);
    if (hasIosOptions) {
        const items = Array.isArray(raw.options)
            ? raw.options.map((item: any) => ({
                id: item.id,
                name: item.name || "",
                nameAr: item.nameAr || "",
                price: item.price ?? 0,
            }))
            : [];
        // Only create an options object if there are items or a header
        if (items.length > 0 || raw.optionsHeader) {
            dish.options = {
                header: raw.optionsHeader || "",
                headerAr: raw.optionsHeaderAr || "",
                required: raw.areOptionsRequired ?? false,
                maxSelection: raw.maxOptionsSelection ?? raw.maxSelection,
                items,
            };
        } else {
            dish.options = undefined;
        }
    } else if (dish.options === null || dish.options === undefined) {
        dish.options = undefined;
    }

    // Clean up raw iOS fields from the normalized object
    delete (dish as any).optionsHeader;
    delete (dish as any).optionsHeaderAr;
    delete (dish as any).areOptionsRequired;
    delete (dish as any).maxOptionsSelection;

    // Normalize allergens: keep id/name/nameAr
    if (Array.isArray(dish.allergens)) {
        dish.allergens = dish.allergens.map((a: any) => ({
            id: a.id,
            name: a.name || "",
            nameAr: a.nameAr || "",
        }));
    }

    return dish;
}

/**
 * Convert web-format dish data to iOS/Firestore format before writing.
 * Web uses: options: { header, headerAr, required, maxSelection, items[] }
 * Firestore uses: optionsHeader, optionsHeaderAr, areOptionsRequired, maxOptionsSelection, options[] (array)
 * Web uses allergens without id. Firestore uses allergens with id.
 */
function toFirestoreDishFormat(data: any): any {
    const result = { ...data };

    // Convert web-format nested options to top-level iOS fields
    if (result.options && typeof result.options === "object" && !Array.isArray(result.options)) {
        const opts = result.options;
        const items = Array.isArray(opts.items)
            ? opts.items.map((item: any) => ({
                id: item.id || generateUUID(),
                name: item.name || "",
                nameAr: item.nameAr || "",
                price: item.price ?? 0,
            }))
            : [];
        // Only write options if there are actual items
        if (items.length > 0) {
            result.optionsHeader = opts.header || null;
            result.optionsHeaderAr = opts.headerAr || null;
            result.areOptionsRequired = opts.required ?? false;
            result.maxOptionsSelection = opts.maxSelection ?? null;
            result.options = items;
        } else {
            // No items — clear everything
            result.options = null;
            result.optionsHeader = null;
            result.optionsHeaderAr = null;
            result.areOptionsRequired = false;
            result.maxOptionsSelection = null;
        }
    } else if (result.options === undefined || result.options === null) {
        // No options — write null for all fields (matching iOS)
        result.options = null;
        result.optionsHeader = null;
        result.optionsHeaderAr = null;
        result.areOptionsRequired = false;
        result.maxOptionsSelection = null;
    }

    // Ensure allergens have id field
    if (Array.isArray(result.allergens)) {
        result.allergens = result.allergens.map((a: any) => ({
            id: a.id || a.name?.toLowerCase().replace(/\s+/g, "_") || generateUUID(),
            name: a.name || "",
            nameAr: a.nameAr || "",
        }));
    } else {
        result.allergens = [];
    }

    return result;
}

// ---------- Restaurants ----------
export async function listRestaurants(): Promise<Restaurant[]> {
    const snap = await getDocs(collection(db, "restaurants"));
    const restaurants = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    // Sort by createdAt if available, newest first (client-side to avoid missing field issues)
    restaurants.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return tb - ta;
    });
    return restaurants;
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
    const snap = await getDoc(doc(db, "restaurants", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

export async function createRestaurant(data: Partial<Omit<Restaurant, "id">>) {
    const refCol = collection(db, "restaurants");
    const docRef = await addDoc(refCol, {
        name: data.name || "New Restaurant",
        nameAr: data.nameAr || "",
        layout: data.layout || "list",
        menuFont: data.menuFont || "system",
        themeColorHex: data.themeColorHex || "#00ffff",
        ...cleanData(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateRestaurant(id: string, data: Partial<Omit<Restaurant, "id">>) {
    await updateDoc(doc(db, "restaurants", id), {
        ...cleanData(data),
        updatedAt: serverTimestamp()
    });
}

/**
 * Delete a restaurant: captures logo+bg paths, cascade-deletes all categories
 * (which cascade-deletes all dishes+images), deletes restaurant doc,
 * then deletes restaurant storage assets.
 * Mimics Swift's deleteRestaurant.
 */
export async function deleteRestaurant(id: string) {
    // 1. Capture restaurant image paths before deletion
    const restDoc = await getDoc(doc(db, "restaurants", id));
    const logoPath = restDoc.exists() ? (restDoc.data()?.logoPath || restDoc.data()?.imagePath) : null;
    const bgPath = restDoc.exists() ? restDoc.data()?.backgroundImagePath : null;

    // 2. Cascade delete all categories (each category cascades to its dishes)
    const cats = await listCategories(id);
    for (const cat of cats) {
        try {
            await deleteCategory(id, cat.id);
        } catch (err) {
            console.warn(`Failed to delete category ${cat.id}, continuing:`, err);
        }
    }

    // 3. Delete the restaurant document
    await deleteDoc(doc(db, "restaurants", id));

    // 4. Delete restaurant-level storage assets (logo, background)
    await deleteStoragePaths([logoPath, bgPath]);
}

// ---------- Categories ----------
export async function listCategories(restaurantId: string): Promise<Category[]> {
    const colRef = collection(db, "restaurants", restaurantId, "categories");
    const snap = await getDocs(colRef);
    const cats = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    return cats.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getCategory(restaurantId: string, categoryId: string): Promise<Category | null> {
    const snap = await getDoc(doc(db, "restaurants", restaurantId, "categories", categoryId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

export async function createCategory(restaurantId: string, data: Partial<Omit<Category, "id">>) {
    const colRef = collection(db, "restaurants", restaurantId, "categories");
    const docRef = await addDoc(colRef, {
        order: data.order ?? 0,
        isActive: data.isActive !== false,
        availabilityStart: data.availabilityStart || null,
        availabilityEnd: data.availabilityEnd || null,
        ...cleanData(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateCategory(
    restaurantId: string,
    categoryId: string,
    data: Partial<Omit<Category, "id">>
) {
    await updateDoc(doc(db, "restaurants", restaurantId, "categories", categoryId), {
        ...cleanData(data),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a category: captures icon path, deletes all dishes (with their images),
 * deletes the category doc, then deletes the category icon from storage.
 * Mimics Swift's deleteCategory.
 */
export async function deleteCategory(restaurantId: string, categoryId: string) {
    // 1. Capture the category icon path before deletion
    const catDoc = await getDoc(doc(db, "restaurants", restaurantId, "categories", categoryId));
    const categoryIconPath = catDoc.exists() ? catDoc.data()?.imagePath : null;

    // 2. Delete all dishes inside this category (cascading — each dish deletes its own images)
    try {
        const dishes = await listDishes(restaurantId, categoryId);
        for (const dish of dishes) {
            try {
                await deleteDish(restaurantId, categoryId, dish.id);
            } catch (err) {
                console.warn(`Failed to delete dish ${dish.id}, continuing:`, err);
            }
        }
    } catch (err) {
        console.warn("Failed to list dishes for deletion, continuing:", err);
    }

    // 3. Delete the category document
    await deleteDoc(doc(db, "restaurants", restaurantId, "categories", categoryId));

    // 4. Delete the category icon from storage
    await deleteStoragePaths([categoryIconPath]);
}

// ---------- Dishes ----------
export async function listDishes(restaurantId: string, categoryId: string): Promise<Dish[]> {
    const colRef = collection(db, "restaurants", restaurantId, "categories", categoryId, "dishes");
    const snap = await getDocs(colRef);
    const dishes = snap.docs.map((d) => normalizeDish({ id: d.id, ...(d.data() as any) }));
    // Sort by createdAt if available, newest first (client-side to avoid missing field issues)
    dishes.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return tb - ta;
    });
    return dishes;
}

export async function listAllDishes(restaurantId: string): Promise<(Dish & { categoryName: string; categoryId: string })[]> {
    const cats = await listCategories(restaurantId);
    const allDishes: (Dish & { categoryName: string; categoryId: string })[] = [];
    for (const cat of cats) {
        const categoryDishes = await listDishes(restaurantId, cat.id);
        allDishes.push(...categoryDishes.map(d => ({ ...d, categoryName: cat.name, categoryId: cat.id })));
    }
    return allDishes;
}

export async function getDish(restaurantId: string, categoryId: string, dishId: string): Promise<Dish | null> {
    const snap = await getDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId));
    if (!snap.exists()) return null;
    return normalizeDish({ id: snap.id, ...(snap.data() as any) });
}

export async function createDish(
    restaurantId: string,
    categoryId: string,
    data: Omit<Dish, "id">
) {
    const colRef = collection(db, "restaurants", restaurantId, "categories", categoryId, "dishes");
    const firestoreData = toFirestoreDishFormat(cleanData(data));
    const docRef = await addDoc(colRef, {
        price: firestoreData.price ?? null,
        imagePaths: [],
        ...firestoreData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateDish(
    restaurantId: string,
    categoryId: string,
    dishId: string,
    data: Partial<Omit<Dish, "id">>
) {
    const firestoreData = toFirestoreDishFormat(cleanData(data));
    await updateDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId), {
        ...firestoreData,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a dish: captures image paths, deletes Firestore doc, then deletes storage images.
 * Mimics Swift's deleteDish.
 */
export async function deleteDish(restaurantId: string, categoryId: string, dishId: string) {
    // 1. Read the dish to capture its image paths before deletion
    const dishDoc = await getDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId));
    const imagePaths: string[] = dishDoc.exists() ? (dishDoc.data()?.imagePaths || []) : [];

    // 2. Delete the Firestore document
    await deleteDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId));

    // 3. Delete associated storage images
    await deleteStoragePaths(imagePaths);
}

// ---------- Image Uploads ----------

/**
 * Upload a restaurant image (logo or background).
 * Logo:       ideal 1024x1024, PNG, path: restaurants/{rid}/logo_{uuid}.png
 * Background: ideal 2048x2048, JPEG, path: restaurants/{rid}/background_{uuid}.jpg
 */
export async function uploadRestaurantImage(
    file: File,
    restaurantId: string,
    type: "logo" | "background",
    onProgress?: (p: number) => void
) {
    try {
        const isLogo = type === 'logo';
        const maxDim = isLogo ? 1024 : 2048;
        const quality = isLogo ? 0.8 : 0.6;
        const processedBlob = await processImage(file, maxDim, quality);

        const uuid = generateUUID();
        const ext = isLogo ? 'png' : 'jpg';
        const contentType = isLogo ? 'image/png' : 'image/jpeg';
        const path = `restaurants/${restaurantId}/${type}_${uuid}.${ext}`;
        const storageRef = ref(storage, path);

        const result = await uploadBytes(storageRef, processedBlob, { contentType });
        onProgress?.(100);
        const url = await getDownloadURL(result.ref);

        return { url, path };
    } catch (err) {
        console.error(`Error uploading restaurant ${type}:`, err);
        throw err;
    }
}

/**
 * Upload a single dish image.
 * Ideal size: 2048 x 1536 (4:3). JPEG, 0.6 quality.
 * Path: dishes/{restaurantId}/{categoryId}/{dishId}/{batchID}_{index}.jpg
 */
export async function uploadDishImage(
    file: File,
    restaurantId: string,
    categoryId: string,
    dishId: string,
    index: number,
    batchId: string,
    onProgress?: (p: number) => void
) {
    const processedBlob = await processImage(file, 2048, 0.6);

    const path = `dishes/${restaurantId}/${categoryId}/${dishId}/${batchId}_${index}.jpg`;
    const storageRef = ref(storage, path);

    const result = await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
    onProgress?.(100);
    const url = await getDownloadURL(result.ref);

    return { url, path };
}

/**
 * Sequential upload for multiple dish images to ensure stable progress UI.
 * Mimics Swift's uploadJPEGs. Uses a single batchID (UUID) for the whole batch.
 */
export async function uploadSequentialDishImages(
    files: File[],
    restaurantId: string,
    categoryId: string,
    dishId: string,
    onProgress?: (idx: number, p: number) => void
) {
    const batchId = generateUUID();
    const results: { url: string; path: string }[] = [];
    for (let i = 0; i < files.length; i++) {
        const res = await uploadDishImage(files[i], restaurantId, categoryId, dishId, i, batchId, (p) => {
            onProgress?.(i, p);
        });
        results.push(res);
        onProgress?.(i, 100);
    }
    return results;
}

/**
 * Upload a category icon image.
 * Ideal size: 1384 x 820 (~1.69:1). JPEG, 0.8 quality.
 * Path: restaurants/{rid}/categories/{cid}/icon.jpg
 */
export async function uploadCategoryImage(
    file: File,
    restaurantId: string,
    categoryId: string,
    onProgress?: (p: number) => void
) {
    const processedBlob = await processImage(file, 1024, 0.8);

    const path = `restaurants/${restaurantId}/categories/${categoryId}/icon.jpg`;
    const storageRef = ref(storage, path);

    const result = await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
    onProgress?.(100);
    const url = await getDownloadURL(result.ref);

    return { url, path };
}

/**
 * Check if a string is a valid Firebase Storage path (not a URL or empty).
 * Mimics Swift's isStoragePath helper.
 */
function isStoragePath(path?: string | null): boolean {
    if (!path) return false;
    if (path.startsWith("http://") || path.startsWith("https://")) return false;
    return path.trim().length > 0;
}

/**
 * Delete multiple storage paths safely.
 * Mimics Swift's deleteStoragePaths helper.
 */
async function deleteStoragePaths(paths: (string | undefined | null)[]) {
    for (const path of paths) {
        if (isStoragePath(path)) {
            try {
                const storageRef = ref(storage, path!);
                await deleteObject(storageRef);
            } catch (err) {
                // Silently ignore — file may not exist
                console.warn("Storage delete skipped:", path, err);
            }
        }
    }
}

export async function deleteImageByPath(path?: string) {
    if (!path) return;
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
    } catch (err) {
        console.error("Error deleting image:", err);
    }
}

export type User = {
    id: string;
    name: string;
    email: string;
    role: "manager" | "viewer";
    restaurantIds?: string[];
    backgroundImagePath?: string;
    createdAt?: any;
    updatedAt?: any;
};

// ---------- Users ----------
export async function listUsers(): Promise<User[]> {
    const snap = await getDocs(collection(db, "users"));
    const users = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    // Sort by createdAt if available, newest first
    users.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const tb = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return tb - ta;
    });
    return users;
}

export async function getUser(id: string): Promise<User | null> {
    const snap = await getDoc(doc(db, "users", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

/**
 * Create a user with Firebase Auth + Firestore profile.
 * Uses a secondary Firebase app instance so the current manager session isn't interrupted.
 * Matches Swift's createUser(withEmail:password:name:restaurants:role:).
 */
export async function createUserWithAuth(
    data: Omit<User, "id"> & { password: string }
) {
    const { password, ...profile } = data;

    // Use a secondary app so the manager's auth session is not affected
    const secondaryApp = getApps().find(a => a.name === "secondary")
        || initializeApp(
            {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            },
            "secondary"
        );
    const secondaryAuth = getAuth(secondaryApp);

    // Create the Firebase Auth user
    const cred = await createUserWithEmailAndPassword(secondaryAuth, data.email, password);
    const uid = cred.user.uid;

    // Sign out the secondary auth immediately
    await secondaryAuth.signOut();

    // Create the Firestore profile using setDoc (matches Swift's setData)
    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
        ...cleanData(profile),
        id: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    return uid;
}

/** Create user profile only (no auth account) — for backwards compat */
export async function createUser(data: Omit<User, "id">) {
    const colRef = collection(db, "users");
    const docRef = await addDoc(colRef, {
        ...cleanData(data),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return docRef.id;
}

export async function updateUser(id: string, data: Partial<Omit<User, "id">>) {
    await updateDoc(doc(db, "users", id), {
        ...cleanData(data),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Delete a user: captures background image path, deletes Firestore doc,
 * then deletes storage images. Mimics Swift's deleteUser.
 */
export async function deleteUser(id: string) {
    // Capture the background image path before deletion
    const userDoc = await getDoc(doc(db, "users", id));
    const bgPath = userDoc.exists() ? userDoc.data()?.backgroundImagePath : null;

    // Delete the Firestore document
    await deleteDoc(doc(db, "users", id));

    // Delete the background image from storage
    await deleteStoragePaths([bgPath]);
}

/**
 * Upload a user background image.
 * Ideal size: 2048 x 2048 (or 1920x1080). JPEG, 0.6 quality.
 * Path: users/{uid}/background_{uuid}.jpg
 */
export async function uploadUserBackgroundImage(file: File, userId: string) {
    const processedBlob = await processImage(file, 2048, 0.6);
    const uuid = generateUUID();
    const path = `users/${userId}/background_${uuid}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
    const url = await getDownloadURL(storageRef);
    return { url, path };
}

// ---------- Import Data (matches Swift DataImportManager) ----------

// Types matching the Swift import JSON schema
export type ImportDishOption = {
    name_en: string;
    name_ar?: string;
    price?: number;
};

export type ImportDish = {
    id: string;
    name_en: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    price?: number;
    allergens_en?: string[];
    allergens_ar?: string[];
    options?: ImportDishOption[];
    options_header_en?: string;
    options_header_ar?: string;
    are_options_required?: boolean;
    max_options_selection?: number;
    is_active?: boolean;
};

export type ImportCategory = {
    id: string;
    name_en: string;
    name_ar?: string;
    dishes: ImportDish[];
};

export type ImportMenu = {
    id: string;
    name_en: string;
    name_ar?: string;
    categories: ImportCategory[];
};

export type ImportSummary = {
    menu: ImportMenu;
    categoryCount: number;
    dishCount: number;
    warnings: string[];
};

/**
 * Parse import JSON. Accepts either `{ menu: { ... } }` wrapper or direct `{ id, name_en, categories }`.
 * Mimics Swift's DataImportManager.parseMenu.
 */
export function parseImportJSON(jsonData: string): ImportMenu {
    const data = JSON.parse(jsonData);

    // Try { menu: { ... } } wrapper first
    if (data.menu && data.menu.id && data.menu.name_en && data.menu.categories) {
        return data.menu as ImportMenu;
    }

    // Try direct format
    if (data.id && data.name_en && data.categories) {
        return data as ImportMenu;
    }

    // Helpful error
    const keys = Object.keys(data).sort().join(", ");
    throw new Error(
        `Invalid JSON structure. Keys found: [${keys}]. Expected 'menu' wrapper or object with 'id', 'name_en', 'categories'.`
    );
}

/**
 * Validate an import menu and return warnings.
 * Mimics Swift's DataImportManager.validate.
 */
export function validateImportMenu(menu: ImportMenu): string[] {
    const warnings: string[] = [];

    if (menu.categories.length === 0) {
        warnings.push("No categories found — menu will be empty.");
    }

    const categoryIDs = new Set<string>();
    for (const cat of menu.categories) {
        if (categoryIDs.has(cat.id)) {
            warnings.push(`Duplicate category ID '${cat.id}' — later entry overwrites.`);
        }
        categoryIDs.add(cat.id);

        if (!cat.name_en.trim()) {
            warnings.push(`Category '${cat.id}' has an empty name.`);
        }
        if (cat.dishes.length === 0) {
            warnings.push(`Category '${cat.name_en}' has no dishes.`);
        }

        const dishIDs = new Set<string>();
        for (const dish of cat.dishes) {
            if (dishIDs.has(dish.id)) {
                warnings.push(`Duplicate dish ID '${dish.id}' in '${cat.name_en}'.`);
            }
            dishIDs.add(dish.id);

            if (dish.price !== undefined && dish.price < 0) {
                warnings.push(`'${dish.name_en}' has a negative price.`);
            }
        }
    }

    return warnings;
}

/**
 * Build Firestore dish fields from import dish data.
 * Mimics Swift's DataImportManager.dishFields.
 */
function buildDishFields(dish: ImportDish): Record<string, any> {
    const fields: Record<string, any> = {
        name: dish.name_en,
        price: dish.price ?? 0,
        description: dish.description_en ?? "",
        imagePaths: [],
        isActive: dish.is_active ?? true,
        createdAt: serverTimestamp(),
    };

    if (dish.name_ar) fields.nameAr = dish.name_ar;
    if (dish.description_ar) fields.descriptionAr = dish.description_ar;

    // Allergens
    if (dish.allergens_en && dish.allergens_en.length > 0) {
        const ar = dish.allergens_ar ?? [];
        fields.allergens = dish.allergens_en.map((name, i) => {
            const d: Record<string, any> = {
                id: name.toLowerCase().replace(/ /g, "_"),
                name,
            };
            if (i < ar.length) d.nameAr = ar[i];
            return d;
        });
    }

    // Options
    if (dish.options && dish.options.length > 0) {
        fields.options = dish.options.map(opt => {
            const d: Record<string, any> = {
                id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`,
                name: opt.name_en,
                price: opt.price ?? 0,
            };
            if (opt.name_ar) d.nameAr = opt.name_ar;
            return d;
        });
        if (dish.options_header_en) fields.optionsHeader = dish.options_header_en;
        if (dish.options_header_ar) fields.optionsHeaderAr = dish.options_header_ar;
        if (dish.are_options_required !== undefined) fields.areOptionsRequired = dish.are_options_required;
        if (dish.max_options_selection !== undefined) fields.maxOptionsSelection = dish.max_options_selection;
    }

    return fields;
}

/**
 * Import a menu into Firestore using batched writes.
 * Mimics Swift's DataImportManager.performImport exactly:
 *   Step 1: Restaurant doc + user link in one batch
 *   Step 2: One batch per category (category doc + all its dishes)
 *
 * @param onProgress - Called with (completedSteps, totalSteps, statusMessage)
 */
export async function importMenuData(
    menu: ImportMenu,
    userId: string,
    onProgress?: (completed: number, total: number, status: string) => void,
): Promise<{ categoryCount: number; dishCount: number }> {
    const restaurantID = menu.id;
    const allCategories = menu.categories;
    const totalSteps = 1 + allCategories.length;
    let completedSteps = 0;

    // Step 1: Restaurant + user link in a single batch
    onProgress?.(completedSteps, totalSteps, "Creating restaurant...");

    const batch1 = writeBatch(db);

    const restRef = doc(db, "restaurants", restaurantID);
    batch1.set(restRef, {
        name: menu.name_en,
        nameAr: menu.name_ar ?? menu.name_en,
        imagePath: "",
        createdAt: serverTimestamp(),
    }, { merge: true });

    const userRef = doc(db, "users", userId);
    batch1.update(userRef, {
        restaurantIds: arrayUnion(restaurantID),
    });

    await batch1.commit();

    completedSteps += 1;
    onProgress?.(completedSteps, totalSteps, "Restaurant created");

    // Step 2: One batch per category (category doc + all its dishes)
    for (const categoryData of allCategories) {
        onProgress?.(completedSteps, totalSteps, `Importing ${categoryData.name_en}...`);

        const batch = writeBatch(db);

        const catRef = doc(db, "restaurants", restaurantID, "categories", categoryData.id);
        batch.set(catRef, {
            name: categoryData.name_en,
            nameAr: categoryData.name_ar ?? categoryData.name_en,
            isActive: true,
            imagePath: "",
            createdAt: serverTimestamp(),
        }, { merge: true });

        for (const dishData of categoryData.dishes) {
            const dishRef = doc(db, "restaurants", restaurantID, "categories", categoryData.id, "dishes", dishData.id);
            batch.set(dishRef, buildDishFields(dishData), { merge: true });
        }

        await batch.commit();

        completedSteps += 1;
        onProgress?.(completedSteps, totalSteps, `Imported ${categoryData.name_en}`);
    }

    const dishCount = allCategories.reduce((sum, c) => sum + c.dishes.length, 0);
    return { categoryCount: allCategories.length, dishCount };
}
