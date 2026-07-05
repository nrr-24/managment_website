"use client";

import { useEffect, useMemo, useState } from "react";
import { storage } from "@/lib/firebase";
import { ImageLightbox } from "./ImageLightbox";

// The storage bucket is public-read for menu assets (see storage.rules), so we
// can build the download URL directly instead of paying a getDownloadURL()
// network round-trip per image. This is the single biggest menu-load speedup.
const BUCKET = storage.app.options.storageBucket;

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    path?: string;
    fallbackIcon?: React.ReactNode;
    /** When true, clicking the image opens a full-screen lightbox */
    lightbox?: boolean;
    /** Route through the Next.js image optimizer (resized WebP). Use on the public menu. */
    optimize?: boolean;
    /** Target render width in px for the optimizer (must be a configured device/image size). */
    optWidth?: number;
}

/** Extracts a storage object path from a Firebase Storage REST URL if possible. */
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

/** Build a public download URL for a storage object path (no network call). */
function publicUrl(objectPath: string): string {
    return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

/** Resolve any stored value (plain path or legacy full URL) to a usable src. */
function resolveSrc(path?: string): string | null {
    if (!path || !BUCKET) return path || null;
    if (path.startsWith("http")) {
        const extracted = tryExtractStoragePathFromFirebaseUrl(path);
        return extracted ? publicUrl(extracted) : path; // non-firebase URL: use as-is
    }
    return publicUrl(path);
}

/**
 * Loads images from Firebase Storage by path. URLs are derived synchronously,
 * so the browser fetches the bytes directly (with native lazy-loading) instead
 * of waiting on a getDownloadURL() call for every image.
 */
export function StorageImage({
    path,
    className,
    alt = "",
    fallbackIcon,
    lightbox = false,
    optimize = false,
    optWidth = 1080,
    ...props
}: StorageImageProps) {
    const rawUrl = useMemo(() => resolveSrc(path), [path]);
    // Serve a resized WebP via the Next.js optimizer for public-menu images.
    const url = useMemo(() => {
        if (!rawUrl) return null;
        if (optimize && rawUrl.includes("firebasestorage.googleapis.com")) {
            return `/_next/image?url=${encodeURIComponent(rawUrl)}&w=${optWidth}&q=72`;
        }
        return rawUrl;
    }, [rawUrl, optimize, optWidth]);
    const [error, setError] = useState(false);
    const [showLightbox, setShowLightbox] = useState(false);

    // Clear any prior error when the path changes.
    useEffect(() => setError(false), [path]);

    if (!path || error || !url) {
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

    const { onClick: _onClick, onError: _onError, ...restProps } = props;

    return (
        <>
            <img
                src={url}
                alt={alt}
                loading="lazy"
                decoding="async"
                className={`${className || ""}${lightbox ? " cursor-zoom-in" : ""}`}
                onError={() => setError(true)}
                onClick={lightbox ? (e) => { e.stopPropagation(); setShowLightbox(true); } : _onClick}
                {...restProps}
            />
            {lightbox && showLightbox && (
                <ImageLightbox src={rawUrl || url} alt={alt} onClose={() => setShowLightbox(false)} />
            )}
        </>
    );
}
