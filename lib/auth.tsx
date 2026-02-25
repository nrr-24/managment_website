'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isManager: boolean;
    hasManagerAccess: boolean;
    canDelete: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [hasManagerAccess, setHasManagerAccess] = useState(false);
    const [canDelete, setCanDelete] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const data = userDoc.data();
                        const role = data?.role;
                        setIsAdmin(role === 'admin');
                        setIsManager(role === 'manager');
                        setHasManagerAccess(role === 'admin' || role === 'manager');
                        setCanDelete(data?.canDelete === true);
                    } else {
                        setIsAdmin(false);
                        setIsManager(false);
                        setHasManagerAccess(false);
                        setCanDelete(false);
                    }
                } catch {
                    setIsAdmin(false);
                    setIsManager(false);
                    setHasManagerAccess(false);
                    setCanDelete(false);
                }
            } else {
                setIsAdmin(false);
                setIsManager(false);
                setHasManagerAccess(false);
                setCanDelete(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isManager, hasManagerAccess, canDelete, signIn, signOut, logout: signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
