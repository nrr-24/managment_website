"use client";

import React from "react";

export function Page({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <h1 style={{ margin: "12px 0" }}>{title}</h1>
            </div>
            <div>{children}</div>
        </div>
    );
}

export function Card({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
                margin: "12px 0",
            }}
        >
            {children}
        </div>
    );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                outline: "none",
            }}
        />
    );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return (
        <textarea
            {...props}
            style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d1d5db",
                outline: "none",
                minHeight: 90,
            }}
        />
    );
}

export function Button({
    children,
    variant = "primary",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "danger" | "ghost" }) {
    const styles =
        variant === "danger"
            ? { background: "#ef4444", color: "white" }
            : variant === "ghost"
                ? { background: "transparent", color: "#111827", border: "1px solid #d1d5db" }
                : { background: "#111827", color: "white" };

    return (
        <button
            {...props}
            style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                ...styles,
            }}
        >
            {children}
        </button>
    );
}
