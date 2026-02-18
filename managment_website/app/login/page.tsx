'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, signInWithGoogle } = useAuth();
    const router = useRouter();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            router.push('/admin/restaurants');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            await signInWithGoogle();
            router.push('/admin/restaurants');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#1c1c1e] overflow-hidden">
            {/* Background Texture/Gradient */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="w-full max-w-md relative z-10 flex flex-col items-center">
                {/* Logo & Header */}
                <div className="mb-10 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl">
                        <svg className="w-10 h-10 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Dining Menu</h1>
                    <p className="text-white/40 font-medium">Welcome back, please sign in</p>
                </div>

                {error && (
                    <div className="w-full mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-500/50 backdrop-blur-md animate-in shake duration-500">
                        <p className="text-sm text-red-200 text-center font-bold font-sans">
                            {error === 'auth/invalid-credential' ? 'Failed to load data. Please try again.' : error}
                        </p>
                    </div>
                )}

                <form onSubmit={handleEmailLogin} className="w-full space-y-4 px-6 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/5 border border-white/5 outline-none text-white focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder:text-white/20"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-white transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            type="password"
                            placeholder="Password"
                            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white/5 border border-white/5 outline-none text-white focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder:text-white/20"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-14 rounded-2xl bg-green-700/80 hover:bg-green-600 font-bold text-white shadow-xl shadow-green-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "Sign In"
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full h-14 rounded-2xl bg-white/5 hover:bg-white/10 font-bold text-white border border-white/5 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Google Login
                    </button>
                </form>

                <p className="mt-10 text-white/20 text-sm font-medium">
                    Facing issues? <a href="#" className="text-white/40 hover:text-white transition-colors">Contact Support</a>
                </p>
            </div>
        </div>
    );
}
