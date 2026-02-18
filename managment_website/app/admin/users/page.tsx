"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { listUsers, User } from "@/lib/data";

export default function UserListPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        listUsers().then(data => {
            setUsers(data);
            setLoading(false);
        });
    }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const actions = (
        <div className="flex items-center gap-2">
            <button
                onClick={() => router.push('/admin/users/new')}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            </button>
            <button className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>
            </button>
        </div>
    );

    return (
        <Page title="Users" actions={actions}>
            <div className="max-w-2xl mx-auto space-y-4">
                <div className="relative mb-8">
                    <input
                        placeholder="Search users..."
                        className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 outline-none text-sm font-medium focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="space-y-3">
                    {filteredUsers.map((u) => (
                        <Card
                            key={u.id}
                            onClick={() => router.push(`/admin/users/${u.id}`)}
                            className="p-4 flex items-center justify-between rounded-3xl cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition-all border border-gray-100 dark:border-gray-800"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center font-bold text-lg">
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-500">{u.name}</h3>
                                    <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="bg-pink-50 text-pink-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">{u.role}</span>
                                <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </div>
                        </Card>
                    ))}

                    {filteredUsers.length === 0 && !loading && (
                        <div className="text-center py-20 text-gray-400 font-medium">
                            {searchTerm ? "No users match your search." : "No users found. Click + to add one."}
                        </div>
                    )}
                </div>
            </div>
        </Page>
    );
}
