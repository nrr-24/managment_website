"use client";

import React from "react";

// ─── FormSection: groups related fields with a title and description ───
interface FormSectionProps {
    title: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export function FormSection({ title, description, children, className = "" }: FormSectionProps) {
    return (
        <div className={`mb-8 ${className}`}>
            <div className="px-1 mb-3">
                <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                {description && (
                    <p className="text-[13px] text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                )}
            </div>
            {children}
        </div>
    );
}

// ─── FormCard: white card container with divide-y between children ───
interface FormCardProps {
    children: React.ReactNode;
    className?: string;
}

export function FormCard({ children, className = "" }: FormCardProps) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200/60 overflow-hidden divide-y divide-gray-100 ${className}`}>
            {children}
        </div>
    );
}

// ─── FormField: wraps a single field with label, required indicator, and hint ───
interface FormFieldProps {
    label?: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}

export function FormField({ label, required, hint, children, className = "" }: FormFieldProps) {
    return (
        <div className={`px-5 py-3.5 ${className}`}>
            {label && (
                <label className="block text-[13px] font-medium text-gray-500 mb-1.5">
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            {children}
            {hint && (
                <p className="text-[12px] text-gray-400 mt-1.5 leading-relaxed">{hint}</p>
            )}
        </div>
    );
}

// ─── FormRow: a flex row inside a FormCard for toggle/inline controls ───
interface FormRowProps {
    label: string;
    hint?: string;
    required?: boolean;
    children: React.ReactNode;
    className?: string;
}

export function FormRow({ label, hint, required, children, className = "" }: FormRowProps) {
    return (
        <div className={`px-5 py-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                    <span className="text-[15px] font-medium text-gray-900">
                        {label}
                        {required && <span className="text-red-400 ml-0.5">*</span>}
                    </span>
                    {hint && (
                        <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">{hint}</p>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

// ─── FormDivider: subtle label divider inside a FormCard ───
export function FormDivider({ label }: { label?: string }) {
    if (!label) return <div className="border-t border-gray-100" />;
    return (
        <div className="px-5 py-2 bg-gray-50/50">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        </div>
    );
}

// ─── Shared input class for consistent styling ───
export const formInputClass = "w-full bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-300 h-11";
export const formTextareaClass = "w-full bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-300 resize-none leading-relaxed";
export const formInputRtlClass = "w-full bg-transparent outline-none text-[15px] text-gray-900 placeholder:text-gray-300 h-11 text-right";
