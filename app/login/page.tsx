'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
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
                setError('Service configuration error.');
            } else if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
                setError('Invalid email or password.');
            } else {
                setError('Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center scale-105"
                style={{
                    backgroundImage: "url('/login-bg.jpg')",
                    filter: "brightness(0.3)",
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                {/* Logo & Header */}
                <div className="mb-8 text-center fade-in-up">
                    <div
                        className="glass-dark rounded-[22px] flex items-center justify-center mx-auto mb-5 border border-white/10 shadow-2xl"
                        style={{ width: 72, height: 72 }}
                    >
                        <svg className="w-9 h-9 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-1.5 tracking-tight">Dining Menu</h1>
                    <p className="text-white/40 font-medium text-sm">Welcome back</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="w-full mb-5 px-4 py-3 rounded-2xl bg-red-500/15 border border-red-500/20 backdrop-blur-md scale-in">
                        <p className="text-sm text-red-300 text-center font-semibold">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleEmailLogin} className="w-full space-y-3 fade-in-up" style={{ animationDelay: '0.15s' }}>
                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-white/60 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full h-[52px] pl-12 pr-5 rounded-2xl bg-white/[0.07] border border-white/[0.08] text-white focus:bg-white/[0.12] focus:border-white/20 font-medium placeholder:text-white/25 text-[15px]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-white/60 transition-colors">
                            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            className="w-full h-[52px] pl-12 pr-12 rounded-2xl bg-white/[0.07] border border-white/[0.08] text-white focus:bg-white/[0.12] focus:border-white/20 font-medium placeholder:text-white/25 text-[15px]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60"
                        >
                            {showPassword ? (
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-[52px] rounded-2xl bg-green-700 hover:bg-green-600 font-semibold text-white shadow-lg shadow-green-900/30 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 text-[15px]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
