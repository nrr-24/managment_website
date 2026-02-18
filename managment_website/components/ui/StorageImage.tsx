"use client";

import { useState, useEffect } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

// In-memory cache to avoid redundant Firebase calls for the same path
const urlCache = new Map<string, string>();

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    path?: string;
    fallbackIcon?: React.ReactNode;
}

/**
 * Extracts a storage path from a Firebase Storage REST URL if possible.
 */
function tryExtractStoragePathFromFirebaseUrl(u: string): string | null {
    try {
        const url = new URL(u);
        if (!url.hostname.includes("firebasestorage.googleapis.com")) return null;

        // Pattern 1: /v0/b/<bucket>/o/<encodedObjectName>
        const m = url.pathname.match(/\/v0\/b\/[^/]+\/o\/(.+)$/);
        if (m?.[1]) return decodeURIComponent(m[1]);

        // Pattern 2: /v0/b/<bucket>/o?name=<encodedObjectName>
        const name = url.searchParams.get("name");
        if (name) return decodeURIComponent(name);

        return null;
    } catch {
        return null;
    }
}

/**
 * A component that loads images from Firebase Storage via path.
 * Mimics Swift's StorageImage view with similar caching and state handling.
 */
export function StorageImage({
    path,
    className,
    alt = "",
    fallbackIcon,
    ...props
}: StorageImageProps) {
    const [url, setUrl] = useState<string | null>(path ? urlCache.get(path) || null : null);
    const [loading, setLoading] = useState(path ? !urlCache.has(path) : false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!path) {
            setUrl(null);
            setLoading(false);
            return;
        }

        if (urlCache.has(path)) {
            setUrl(urlCache.get(path)!);
            setLoading(false);
            setError(false);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setError(false);

        async function fetchUrl() {
            try {
                // If path is a full URL (legacy), try to extract path or use it as fallback
                if (path?.startsWith('http')) {
                    const extracted = tryExtractStoragePathFromFirebaseUrl(path);
                    if (extracted) {
                        const sRef = ref(storage, extracted);
                        const dUrl = await getDownloadURL(sRef);
                        if (isMounted) {
                            urlCache.set(path, dUrl);
                            setUrl(dUrl);
                            setLoading(false);
                        }
                    } else {
                        // Non-firebase or opaque URL
                        if (isMounted) {
                            setUrl(path);
                            setLoading(false);
                        }
                    }
                    return;
                }

                const sRef = ref(storage, path);
                const dUrl = await getDownloadURL(sRef);

                if (isMounted) {
                    urlCache.set(path!, dUrl);
                    setUrl(dUrl);
                    setLoading(false);
                }
            } catch (err) {
                console.error("StorageImage error for path:", path, err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                }
            }
        }

        fetchUrl();

        return () => { isMounted = false; };
    }, [path]);

    if (!path || error) {
        return (
            <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 ${className}`}>
                {fallbackIcon || (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                    </svg>
                )}
            </div>
        );
    }

    if (loading) {
        return (
            <div className={`flex items-center justify-center bg-gray-50 dark:bg-gray-900 animate-pulse ${className}`}>
                <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!url) return null;

    return <img src={url} alt={alt} className={className} {...props} />;
}
