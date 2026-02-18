import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "./firebase";

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

/**
 * Resizes and compresses an image before upload.
 * Mimics Swift's resized(maxDimension:) and jpegData(compressionQuality:)
 */
async function processImage(file: File, maxDimension: number, quality: number): Promise<Blob> {
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
};

export type Dish = {
    id: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    price?: number;
    imagePaths?: string[];
    imageUrls?: string[];
    allergens?: { name: string; nameAr?: string }[];
    options?: {
        header: string;
        headerAr?: string;
        required?: boolean;
        maxSelection?: number;
        items: { name: string; nameAr?: string; price?: number }[];
    };
    isActive?: boolean;
    createdAt?: any;
    updatedAt?: any;
};

// ---------- Restaurants ----------
export async function listRestaurants(): Promise<Restaurant[]> {
    const snap = await getDocs(query(collection(db, "restaurants"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
    const snap = await getDoc(doc(db, "restaurants", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

export async function createRestaurant(data: Partial<Omit<Restaurant, "id">>) {
    const refCol = collection(db, "restaurants");
    const docRef = await addDoc(refCol, {
        ...cleanData(data),
        name: data.name || "New Restaurant",
        nameAr: data.nameAr || "",
        imagePath: "",
        layout: data.layout || "list",
        menuFont: data.menuFont || "system",
        themeColorHex: data.themeColorHex || "#00ffff",
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

export async function deleteRestaurant(id: string) {
    // NOTE: subcollections are NOT auto-deleted. Keep it simple:
    // only delete restaurant doc. If you want recursive delete, do it via Admin SDK / Cloud Function.
    await deleteDoc(doc(db, "restaurants", id));
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

export async function createCategory(restaurantId: string, data: { name: string; order?: number }) {
    const colRef = collection(db, "restaurants", restaurantId, "categories");
    const docRef = await addDoc(colRef, {
        ...cleanData(data),
        order: data.order ?? 0,
        imagePath: "",
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

export async function deleteCategory(restaurantId: string, categoryId: string) {
    await deleteDoc(doc(db, "restaurants", restaurantId, "categories", categoryId));
}

// ---------- Dishes ----------
export async function listDishes(restaurantId: string, categoryId: string): Promise<Dish[]> {
    const colRef = collection(db, "restaurants", restaurantId, "categories", categoryId, "dishes");
    const snap = await getDocs(query(colRef, orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
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
    return { id: snap.id, ...(snap.data() as any) };
}

export async function createDish(
    restaurantId: string,
    categoryId: string,
    data: Omit<Dish, "id">
) {
    const colRef = collection(db, "restaurants", restaurantId, "categories", categoryId, "dishes");
    const docRef = await addDoc(colRef, {
        ...cleanData(data),
        price: data.price ?? null,
        imagePaths: [],
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
    await updateDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId), {
        ...cleanData(data),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteDish(restaurantId: string, categoryId: string, dishId: string) {
    await deleteDoc(doc(db, "restaurants", restaurantId, "categories", categoryId, "dishes", dishId));
}

// ---------- Image Uploads ----------
export async function uploadRestaurantImage(
    file: File,
    restaurantId: string,
    type: "logo" | "background",
    onProgress?: (p: number) => void
) {
    try {
        console.log(`Starting restaurant ${type} upload for ${restaurantId}...`);
        const processedBlob = await processImage(file, type === 'background' ? 2048 : 1024, type === 'background' ? 0.6 : 0.8);
        const ext = "jpg";
        const path = `restaurants/${restaurantId}/${type}.${ext}`;
        const storageRef = ref(storage, path);

        const url = await (async () => {
            const result = await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
            console.log(`Upload ${type} complete!`);
            onProgress?.(100);
            return await getDownloadURL(result.ref);
        })();

        return { url, path };
    } catch (err) {
        console.error(`Error uploading restaurant ${type}:`, err);
        throw err;
    }
}

export async function uploadDishImage(
    file: File,
    restaurantId: string,
    categoryId: string,
    onProgress?: (p: number) => void
) {
    console.log(`Starting dish image upload for restaurant ${restaurantId}, category ${categoryId}...`);

    // Process image: 2048px max, 0.6 quality (matches Swift)
    const processedBlob = await processImage(file, 2048, 0.6);

    const ts = Date.now();
    const ext = "jpg"; // We convert everything to jpeg in processImage
    const path = `restaurants/${restaurantId}/categories/${categoryId}/dishes/${ts}.${ext}`;
    const storageRef = ref(storage, path);

    const url = await (async () => {
        const result = await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
        onProgress?.(100);
        return await getDownloadURL(result.ref);
    })();

    return { url, path };
}

/**
 * Sequential upload for multiple dish images to ensure stable progress UI.
 * Mimics Swift's uploadJPEGs.
 */
export async function uploadSequentialDishImages(
    files: File[],
    restaurantId: string,
    categoryId: string,
    onProgress?: (idx: number, p: number) => void
) {
    const results: { url: string; path: string }[] = [];
    for (let i = 0; i < files.length; i++) {
        const res = await uploadDishImage(files[i], restaurantId, categoryId, (p) => {
            onProgress?.(i, p);
        });
        results.push(res);
        onProgress?.(i, 100);
    }
    return results;
}

export async function uploadCategoryImage(
    file: File,
    restaurantId: string,
    categoryId: string,
    onProgress?: (p: number) => void
) {
    console.log(`Starting category image upload for restaurant ${restaurantId}, category ${categoryId}...`);

    // Process image: 1024px max, 0.8 quality
    const processedBlob = await processImage(file, 1024, 0.8);

    const ext = "jpg";
    const path = `restaurants/${restaurantId}/categories/${categoryId}/image.${ext}`;
    const storageRef = ref(storage, path);

    const url = await (async () => {
        const result = await uploadBytes(storageRef, processedBlob, { contentType: 'image/jpeg' });
        onProgress?.(100);
        return await getDownloadURL(result.ref);
    })();

    return { url, path };
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
    restaurantAccess?: string[];
    backgroundImage?: string;
    backgroundImagePath?: string;
    createdAt?: any;
    updatedAt?: any;
};

// ---------- Users ----------
export async function listUsers(): Promise<User[]> {
    const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getUser(id: string): Promise<User | null> {
    const snap = await getDoc(doc(db, "users", id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as any) };
}

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

export async function deleteUser(id: string) {
    await deleteDoc(doc(db, "users", id));
}

export async function uploadUserBackgroundImage(file: File, userId: string) {
    const ext = file.name.split(".").pop();
    const path = `users/${userId}/background.${ext}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path };
}
