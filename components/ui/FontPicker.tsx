"use client";

import React, { useState } from 'react';
import { Card } from './Card';

const FONTS = [
    { id: 'system', name: 'System Default', css: 'font-sans' },
    { id: 'inter', name: 'Inter (Modern)', css: 'font-inter', import: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap' },
    { id: 'playfair', name: 'Playfair (Elegant)', css: 'font-playfair', import: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap' },
    { id: 'montserrat', name: 'Montserrat (Bold)', css: 'font-montserrat', import: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap' },
    { id: 'outfit', name: 'Outfit (Clean)', css: 'font-outfit', import: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;700&display=swap' },
];

interface FontPickerProps {
    value: string;
    onChange: (fontId: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
    const [open, setOpen] = useState(false);

    const selectedFont = FONTS.find(f => f.id === value) || FONTS[0];

    return (
        <div className="relative">
            <Card
                onClick={() => setOpen(!open)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 rounded-2xl group transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className="text-blue-500 font-bold text-xl">Aa</div>
                    <div>
                        <p className="text-xs font-bold text-gray-400">Menu Font</p>
                        <p className="font-bold capitalize">{selectedFont.name}</p>
                    </div>
                </div>
                <svg className={`w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </Card>

            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200">
                    {FONTS.map(f => (
                        <div
                            key={f.id}
                            onClick={() => {
                                onChange(f.id);
                                setOpen(false);
                            }}
                            className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${value === f.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <span className={`font-bold ${value === f.id ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                {f.name}
                            </span>
                            {value === f.id && (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Helper to get Google Fonts import URLs and font classes
export const getFontConfig = (id: string) => {
    const f = FONTS.find(font => font.id === id) || FONTS[0];
    return {
        import: f.import,
        class: f.css || 'font-sans'
    };
};
