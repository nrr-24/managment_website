"use client";

import Link from "next/link";

interface Crumb {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: Crumb[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    if (items.length <= 1) return null;

    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto no-scrollbar px-1 -mt-4 mb-4">
            {items.map((crumb, i) => {
                const isLast = i === items.length - 1;
                return (
                    <span key={i} className="flex items-center gap-1 flex-shrink-0">
                        {i > 0 && (
                            <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                        {isLast || !crumb.href ? (
                            <span className="text-[12px] font-medium text-gray-400 truncate max-w-[120px]">{crumb.label}</span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="text-[12px] font-medium text-green-800 hover:text-green-900 truncate max-w-[120px] transition-colors"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
