"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

/**
 * Full-screen image lightbox overlay.
 * Rendered via portal to document.body so it's always centered
 * regardless of parent transforms or scroll position.
 * Click backdrop or X button to close. Press Escape to close.
 */
export function ImageLightbox({ src, alt = "", onClose }: ImageLightboxProps) {
    const handleEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener("keydown", handleEsc);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [handleEsc]);

    return createPortal(
        <div
            style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={onClose}
        >
            {/* Backdrop */}
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }} />

            {/* Close button */}
            <button
                onClick={onClose}
                style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 40, height: 40, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Close"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Image */}
            <img
                src={src}
                alt={alt}
                style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}
                onClick={(e) => e.stopPropagation()}
            />
        </div>,
        document.body
    );
}
