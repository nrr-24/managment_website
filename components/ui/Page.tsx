import React from 'react';
import { useRouter } from 'next/navigation';

interface PageProps {
    title: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
    showBack?: boolean;
    backPath?: string;
    leftAction?: React.ReactNode;
}

export function Page({ title, children, actions, showBack = true, backPath, leftAction }: PageProps) {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-black font-sans antialiased text-gray-900 dark:text-white">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* iOS Style Toolbar Header */}
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-[#f5f5f7]/80 dark:bg-black/80 backdrop-blur-md z-10 py-2">
                    <div className="flex-1 flex text-left">
                        {leftAction ? leftAction : showBack && (
                            <button
                                onClick={() => backPath ? router.push(backPath) : router.back()}
                                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-900 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <h1 className="flex-1 text-center text-lg md:text-xl font-bold truncate px-4">
                        {title}
                    </h1>

                    <div className="flex-1 flex justify-end gap-2">
                        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm px-3 py-1.5 rounded-full flex gap-3 items-center shadow-sm border border-white/20">
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                                </svg>
                            </button>
                            <button className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                                </svg>
                            </button>
                            {actions}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
