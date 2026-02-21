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
    isManager: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isManager, setIsManager] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUser(user);
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    setIsManager(userDoc.exists() && userDoc.data()?.role === 'manager');
                } catch {
                    setIsManager(false);
                }
            } else {
                setIsManager(false);
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
        <AuthContext.Provider value={{ user, loading, isManager, signIn, signOut, logout: signOut }}>
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
