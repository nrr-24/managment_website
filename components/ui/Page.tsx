import React from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from './Breadcrumbs';

interface PageProps {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    showBack?: boolean;
    backPath?: string;
    leftAction?: React.ReactNode;
    breadcrumbs?: { label: string; href?: string }[];
}

export function Page({ title, children, actions, showBack = true, backPath, leftAction, breadcrumbs }: PageProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#f8f8fa] font-sans antialiased text-gray-900">
            <div className="container mx-auto px-4 py-6 max-w-3xl">
                {/* iOS-style sticky toolbar */}
                <div className="flex items-center justify-between mb-6 sticky top-14 glass z-10 py-2.5 px-1 -mx-1 rounded-2xl">
                    <div className="flex-1 flex text-left">
                        {leftAction ? leftAction : showBack && (
                            <button
                                aria-label="Go back"
                                onClick={() => backPath ? router.push(backPath) : router.back()}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <h1 className="flex-1 text-center text-[17px] font-semibold truncate px-2 text-gray-900">
                        {title}
                    </h1>

                    <div className="flex-1 flex justify-end">
                        <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-full border border-gray-200/60 shadow-sm">
                            <button
                                aria-label="Go to dashboard"
                                onClick={() => router.push('/admin')}
                                className="p-1 text-gray-400 hover:text-green-800 active:scale-90 transition-all"
                            >
                                <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                </svg>
                            </button>
                            {actions}
                        </div>
                    </div>
                </div>

                {/* Breadcrumbs */}
                {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

                {/* Content with stagger animation */}
                <div className="space-y-5 stagger-children">
                    {children}
                </div>
            </div>
        </div>
    );
}
