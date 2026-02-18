'use client';

import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
    const { signOut, user } = useAuth();
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
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                </svg>
            ),
            color: 'bg-green-50 text-green-700',
        },
        {
            title: 'User Access',
            desc: 'Create & manage users',
            href: '/admin/users',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
            ),
            color: 'bg-blue-50 text-blue-600',
        },
        {
            title: 'Import Data',
            desc: 'Upload menu from JSON',
            href: '/admin/import',
            icon: (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
            ),
            color: 'bg-orange-50 text-orange-600',
        }
    ];

    return (
        <div className="min-h-screen bg-[#f8f8fa] font-sans">
            <div className="container mx-auto px-4 py-12 max-w-lg">
                {/* Header */}
                <div className="text-center mb-10 fade-in-up">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-1">Management</h1>
                    {user?.email && (
                        <p className="text-sm text-gray-400 font-medium">{user.email}</p>
                    )}
                </div>

                {/* Menu Items */}
                <div className="space-y-3 stagger-children mb-16">
                    {items.map((item, idx) => (
                        <Card
                            key={idx}
                            className="p-4 hover:bg-white transition-all cursor-pointer group rounded-2xl border-gray-200/60 bg-white shadow-sm hover:shadow-md"
                            onClick={() => router.push(item.href)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-11 h-11 ${item.color} rounded-[14px] flex items-center justify-center`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[15px] text-gray-900">{item.title}</h3>
                                        <p className="text-[13px] text-gray-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                                <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Sign Out */}
                <div className="flex justify-center fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <button
                        onClick={handleSignOut}
                        className="rounded-full px-6 py-2.5 flex items-center gap-2 text-red-500 text-sm font-semibold hover:bg-red-50 active:scale-[0.97] transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
