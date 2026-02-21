"use client";

import { useEffect } from "react";

/**
 * Warns the user before leaving the page with unsaved changes.
 * Uses the browser's native `beforeunload` event for tab close/refresh.
 */
export function useUnsavedChanges(isDirty: boolean) {
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);
}
