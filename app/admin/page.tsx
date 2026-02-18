'use client';

import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
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
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 10v7h3v-7H4zm12 0v7h3v-7h-3zM2 22h19v-3H2v3zM14 10v7h-1v-7h1zm-5 0v7H8v-7h1zM2 9l9.5-7L21 9v1H2V9z" />
                    </svg>
                </div>
            )
        },
        {
            title: 'User Access',
            desc: 'Create & manage users',
            href: '/admin/users',
            icon: (
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        <path d="M12.5 17.5l-1.5 1.5 1.5 1.5M14.5 17.5l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                </div>
            )
        },
        {
            title: 'Viewer Mode',
            desc: 'Preview as a customer',
            href: '/',
            icon: (
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                </div>
            )
        },
        {
            title: 'Import Data',
            desc: 'Upload menu from JSON',
            href: '/admin/import',
            icon: (
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-[#f5f5f7] dark:bg-black font-sans">
            <div className="container mx-auto px-4 py-12 max-w-2xl">
                <h1 className="text-4xl font-bold text-center mb-12 py-10">Management</h1>

                <div className="space-y-4 mb-12">
                    {items.map((item, idx) => (
                        <Card
                            key={idx}
                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all cursor-pointer group rounded-3xl"
                            onClick={() => item.href !== '#' && router.push(item.href)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {item.icon}
                                    <div>
                                        <h3 className="font-bold text-lg">{item.title}</h3>
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
                    <Button
                        variant="danger"
                        onClick={handleSignOut}
                        className="rounded-2xl px-8 flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </Button>
                </div>
            </div>
        </div>
    );
}
