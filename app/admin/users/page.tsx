"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Page } from "@/components/ui/Page";
import { Card } from "@/components/ui/Card";
import { useGlobalUI } from "@/components/ui/Toast";
import { UserListSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth";
import { listUsers, deleteUser, User } from "@/lib/data";

export default function UserListPage() {
    const router = useRouter();
    const { user: currentAuthUser } = useAuth();
    const { toast, confirm } = useGlobalUI();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        listUsers().then(data => {
            setUsers(data);
        }).catch(err => {
            console.error(err);
            toast("Failed to load users", "error");
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    async function handleDelete(u: User) {
        const ok = await confirm({ title: "Delete User", message: `Are you sure you want to delete ${u.name}? This cannot be undone.`, destructive: true });
        if (!ok) return;
        setDeletingId(u.id);
        try {
            await deleteUser(u.id);
            setUsers(prev => prev.filter(x => x.id !== u.id));
            toast("User deleted.");
        } catch (err) {
            console.error(err);
            toast("Failed to delete user", "error");
        } finally {
            setDeletingId(null);
        }
    }

    const isCurrentUser = (u: User) => u.id === currentAuthUser?.uid;

    const actions = (
        <button
            onClick={() => router.push('/admin/users/new')}
            aria-label="Add new user"
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
        >
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </button>
    );

    return (
        <Page title={`Users (${filteredUsers.length})`} actions={actions}>
            {/* Search */}
            <div className="relative">
                <input
                    placeholder="Search users..."
                    className="w-full h-11 pl-11 pr-4 rounded-2xl bg-white border border-gray-100 outline-none text-sm font-medium focus:border-green-800 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            {/* User List */}
            <div className="space-y-2">
                {loading ? (
                    <UserListSkeleton />
                ) : filteredUsers.length === 0 ? (
                    <Card className="p-12 text-center text-gray-500 rounded-3xl">
                        {users.length === 0
                            ? "No users yet. Click + to create one."
                            : "No results found."}
                    </Card>
                ) : (
                    filteredUsers.map((u) => {
                        const isCurrent = isCurrentUser(u);
                        const isManager = u.role === "manager";

                        return (
                            <Card
                                key={u.id}
                                onClick={() => router.push(`/admin/users/${u.id}`)}
                                className="p-3 hover:bg-gray-50 transition-all rounded-2xl border border-gray-100 cursor-pointer"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex-1 flex items-center gap-3">
                                        {/* Icon */}
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                            isManager
                                                ? 'bg-purple-100 text-purple-600'
                                                : 'bg-green-50 text-green-800'
                                        }`}>
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                {isManager ? (
                                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                                                ) : (
                                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                )}
                                            </svg>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-blue-600">{u.name}</h3>
                                                {isCurrent && (
                                                    <span className="text-[9px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium">{u.email}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Role Badge */}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                                            isManager
                                                ? 'bg-purple-50 text-purple-600'
                                                : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {u.role}
                                        </span>

                                        {/* Delete button - only for non-current users */}
                                        {!isCurrent && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(u);
                                                }}
                                                disabled={deletingId === u.id}
                                                aria-label={`Delete ${u.name}`}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}

                                        {/* Chevron */}
                                        <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>
        </Page>
    );
}
