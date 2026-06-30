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
    /** Lock the page to the viewport height (md+) so inner regions scroll instead of the window. */
    fullHeight?: boolean;
    /** Override the default max content width (e.g. "max-w-6xl"). */
    maxWidth?: string;
}

export function Page({ title, children, actions, showBack = true, backPath, leftAction, breadcrumbs, fullHeight = false, maxWidth = "max-w-3xl" }: PageProps) {
    const router = useRouter();

    return (
        <div className={`bg-[#f8f8fa] font-sans antialiased text-gray-900 ${fullHeight ? "min-h-screen md:h-[calc(100dvh-3.5rem)] md:overflow-hidden md:flex md:flex-col" : "min-h-screen"}`}>
            <div className={`container mx-auto px-4 ${maxWidth} ${fullHeight ? "py-4 md:flex-1 md:min-h-0 md:flex md:flex-col" : "py-6"}`}>
                {/* iOS-style sticky toolbar — top-0 on mobile (nav hidden), top-14 on desktop */}
                <div className={`flex items-center justify-between glass z-10 py-2.5 px-1 -mx-1 rounded-2xl ${fullHeight ? "relative shrink-0 mb-3" : "mb-6 sticky top-0 sm:top-14"}`}>
                    <div className="flex-1 flex text-left">
                        {leftAction ? leftAction : showBack && (
                            <button
                                aria-label="Go back"
                                onClick={() => backPath ? router.push(backPath) : router.back()}
                                className="w-11 h-11 sm:w-9 sm:h-9 flex items-center justify-center rounded-full hover:bg-black/5 active:scale-90 transition-all"
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
                                className="p-1.5 text-gray-400 hover:text-green-800 active:scale-90 transition-all"
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
                {breadcrumbs && <div className={fullHeight ? "shrink-0" : ""}><Breadcrumbs items={breadcrumbs} /></div>}

                {/* Content with stagger animation */}
                <div className={fullHeight ? "stagger-children flex-1 min-h-0 flex flex-col" : "space-y-5 stagger-children"}>
                    {children}
                </div>
            </div>
        </div>
    );
}
