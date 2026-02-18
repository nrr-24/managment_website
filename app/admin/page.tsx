'use client';

import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const { signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    const items = [
        {
            title: 'Restaurants',
            desc: 'Manage menus & settings',
            href: '/admin/restaurants',
            icon: (
                <div className="w-10 h-10 bg-green-50 text-green-800 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                    </svg>
                </div>
            )
        },
        {
            title: 'User Access',
            desc: 'Create & manage users',
            href: '/admin/users',
            icon: (
                <div className="w-10 h-10 bg-green-50 text-green-800 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                </div>
            )
        },
        {
            title: 'Import Data',
            desc: 'Upload menu from JSON',
            href: '/admin/import',
            icon: (
                <div className="w-10 h-10 bg-green-50 text-green-800 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-white font-sans">
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-4xl font-bold text-center mb-12 py-10 text-gray-900">Management</h1>

                <div className="space-y-4 mb-12">
                    {items.map((item, idx) => (
                        <Card
                            key={idx}
                            className="p-4 hover:bg-gray-50 transition-all cursor-pointer group rounded-3xl"
                            onClick={() => item.href !== '#' && router.push(item.href)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {item.icon}
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">{item.title}</h3>
                                        <p className="text-sm text-gray-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-center mt-20">
                    <button
                        onClick={handleSignOut}
                        className="rounded-2xl px-8 py-3 flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 font-bold hover:bg-red-100 transition-all active:scale-[0.98]"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
