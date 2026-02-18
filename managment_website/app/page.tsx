"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { listRestaurants, Restaurant } from "@/lib/data";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
      setFetching(true);
      listRestaurants().then(data => {
        setRestaurants(data);
        setFetching(false);
      }).catch(err => {
        console.error(err);
        setFetching(false);
      });
    }
  }, [user]);

  if (loading) return null;

  if (user) {
    return (
      <div className="min-h-screen bg-[#1c1c1e] text-white relative overflow-hidden font-sans antialiased">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

        <div className="relative z-10 container mx-auto px-6 py-8 max-w-2xl">
          {/* Toolbar */}
          <header className="flex items-center justify-between mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="w-10" /> {/* Replaced back button with spacer if we are on root, or keep it if it's meant to go somewhere specific */}

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`w-10 h-10 flex items-center justify-center bg-white/5 rounded-full transition-colors ${showSearch ? 'text-blue-500' : 'text-white/50 hover:text-white'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
              <div className="w-max px-3 py-1 bg-white/5 rounded-full flex gap-3 text-[10px] font-bold text-white/40">
                <span>AA</span>
                <span>AR</span>
              </div>
            </div>
          </header>

          {/* Search Input */}
          {showSearch && (
            <div className="mb-8 animate-in fade-in slide-in-from-top-2">
              <div className="relative">
                <input
                  autoFocus
                  placeholder="Search restaurants..."
                  className="w-full h-14 pl-12 pr-4 rounded-2xl bg-white/10 border border-white/10 outline-none text-white focus:border-blue-500/50 transition-all font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white">✕</button>
                )}
              </div>
            </div>
          )}

          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 mb-2">WELCOME</p>
            <h1 className="text-3xl font-bold tracking-tight">Choose a Restaurant</h1>
          </div>

          {fetching ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              {restaurants.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || (r.nameAr && r.nameAr.includes(searchTerm))).map(res => (
                <Link key={res.id} href={`/restaurants/${res.id}`}>
                  <div className="group cursor-pointer">
                    <div className="aspect-square rounded-[2.5rem] bg-[#2c2c2e] border border-white/5 overflow-hidden relative mb-4 shadow-2xl group-active:scale-95 transition-all duration-300">
                      {res.logo ? (
                        <img src={res.logo} alt={res.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10">
                          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" /></svg>
                        </div>
                      )}
                      {/* Image Overlay Texture */}
                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-center text-sm font-bold text-white/90 group-hover:text-white transition-colors tracking-tight">{res.name}</p>
                  </div>
                </Link>
              ))}

              {restaurants.length === 0 && (
                <div className="col-span-2 text-center py-10">
                  <p className="text-white/20">No restaurants found.</p>
                  <Link href="/admin/restaurants/new" className="text-green-500 font-bold mt-2 inline-block">Create your first one</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 transition-colors duration-500">

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-4xl mx-auto fade-in">
          <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-8">
            <span className="block text-gray-900 dark:text-white">Professional</span>
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Menu Builder</span>
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            Create stunning, interactive digital menus for your restaurant in minutes. Clean, premium, and built for modern hospitality.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/login">
              <Button variant="primary" className="text-lg px-10 py-5 rounded-2xl shadow-xl shadow-blue-500/20">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-10">
          <Card className="p-10 rounded-[2.5rem] bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl border-white/20 hover:translate-y-[-8px] transition-all duration-500 shadow-sm hover:shadow-2xl">
            <div className="w-14 h-14 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Smart CMS</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Organize categories, dishes, and allergens with an intuitive iOS-inspired interface.
            </p>
          </Card>

          <Card className="p-10 rounded-[2.5rem] bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl border-white/20 hover:translate-y-[-8px] transition-all duration-500 shadow-sm hover:shadow-2xl">
            <div className="w-14 h-14 bg-purple-500/10 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Visual Design</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Upload multiple images per dish and customize colors to match your restaurant branding.
            </p>
          </Card>

          <Card className="p-10 rounded-[2.5rem] bg-white/50 dark:bg-white/[0.02] backdrop-blur-xl border-white/20 hover:translate-y-[-8px] transition-all duration-500 shadow-sm hover:shadow-2xl">
            <div className="w-14 h-14 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">Fast Setup</h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Deploy your menu instantly via QR code and update prices in real-time.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
