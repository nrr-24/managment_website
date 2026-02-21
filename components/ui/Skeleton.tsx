"use client";

import React from "react";

// ─── Base Skeleton ───
export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`bg-gray-200/70 rounded-xl animate-pulse ${className}`}
            style={{ animationDuration: "1.5s" }}
        />
    );
}

// ─── Restaurant List Skeleton ───
export function RestaurantListSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/60 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32 rounded-lg" />
                            <Skeleton className="h-3 w-20 rounded-lg" />
                        </div>
                        <Skeleton className="w-4 h-4 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Category List Skeleton ───
export function CategoryListSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/60 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
                        <Skeleton className="h-4 w-28 rounded-lg flex-1" />
                        <div className="flex gap-1">
                            <Skeleton className="w-9 h-9 rounded-lg" />
                            <Skeleton className="w-9 h-9 rounded-lg" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Dish List Skeleton ───
export function DishListSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/60 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-36 rounded-lg" />
                            <Skeleton className="h-3 w-24 rounded-lg" />
                        </div>
                        <Skeleton className="h-4 w-16 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Form Skeleton ───
export function FormSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <Skeleton className="h-3 w-24 rounded-lg ml-4" />
                <div className="bg-white rounded-2xl border border-gray-200/60 p-0 overflow-hidden divide-y divide-gray-100">
                    <div className="px-6 py-4"><Skeleton className="h-5 w-48 rounded-lg" /></div>
                    <div className="px-6 py-4"><Skeleton className="h-5 w-32 rounded-lg" /></div>
                </div>
            </div>
            <div className="space-y-1">
                <Skeleton className="h-3 w-20 rounded-lg ml-4" />
                <div className="bg-white rounded-2xl border border-gray-200/60 p-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
            </div>
            <div className="space-y-1">
                <Skeleton className="h-3 w-16 rounded-lg ml-4" />
                <div className="bg-white rounded-3xl border border-gray-200/60 p-8 flex flex-col items-center">
                    <Skeleton className="w-24 h-24 rounded-3xl" />
                    <Skeleton className="h-5 w-32 rounded-lg mt-4" />
                </div>
            </div>
        </div>
    );
}

// ─── User List Skeleton ───
export function UserListSkeleton() {
    return (
        <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200/60 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-28 rounded-lg" />
                            <Skeleton className="h-3 w-40 rounded-lg" />
                        </div>
                        <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}
