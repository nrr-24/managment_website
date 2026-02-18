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
        <div className="min-h-screen bg-white font-sans antialiased text-gray-900">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* iOS Style Toolbar Header */}
                <div className="flex items-center justify-between mb-8 sticky top-14 bg-white/80 backdrop-blur-md z-10 py-2">
                    <div className="flex-1 flex text-left">
                        {leftAction ? leftAction : showBack && (
                            <button
                                onClick={() => backPath ? router.push(backPath) : router.back()}
                                className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 border border-gray-100"
                            >
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <h1 className="flex-1 text-center text-lg md:text-xl font-bold truncate px-4 text-gray-900">
                        {title}
                    </h1>

                    <div className="flex-1 flex justify-end gap-2">
                        <div className="bg-gray-50 px-3 py-1.5 rounded-full flex gap-3 items-center shadow-sm border border-gray-100">
                            <button
                                onClick={() => router.push('/admin')}
                                className="text-gray-500 hover:text-green-800 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
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
