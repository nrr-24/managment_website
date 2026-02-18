'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signIn(email, password);
            router.push('/admin');
        } catch (err: any) {
            const msg = err.message || 'Failed to sign in';
            if (msg.includes('api-key-not-valid')) {
                setError('Service configuration error. Please check your environment variables.');
            } else if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
                setError('Invalid email or password.');
            } else {
                setError(msg);
            }
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
                            {error}
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

                </form>

            </div>
        </div>
    );
}
