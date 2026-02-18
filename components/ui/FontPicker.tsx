"use client";

import React, { useState } from 'react';
import { Card } from './Card';

const FONTS = [
    { id: 'system', name: 'System', preview: 'Aa' },
    { id: 'serif', name: 'Serif', preview: 'Aa' },
    { id: 'rounded', name: 'Rounded', preview: 'Aa' },
    { id: 'monospaced', name: 'Monospaced', preview: 'Aa' },
    { id: 'condensed', name: 'Condensed', preview: 'Aa' },
    { id: 'expanded', name: 'Expanded', preview: 'Aa' },
    { id: 'italic', name: 'Italic', preview: 'Aa' },
    { id: 'slab', name: 'Slab', preview: 'Aa' },
    { id: 'elegant', name: 'Elegant', preview: 'Aa' },
    { id: 'handwritten', name: 'Handwritten', preview: 'Aa' },
    { id: 'geometric', name: 'Geometric', preview: 'Aa' },
    { id: 'classic', name: 'Classic', preview: 'Aa' },
];

// Font style maps for preview rendering
const fontStyleMap: Record<string, React.CSSProperties> = {
    system: { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' },
    serif: { fontFamily: '"New York", "Times New Roman", Georgia, serif' },
    rounded: { fontFamily: '"SF Pro Rounded", "Nunito", system-ui, sans-serif', letterSpacing: '0.02em' },
    monospaced: { fontFamily: '"SF Mono", "Menlo", "Courier New", monospace' },
    condensed: { fontFamily: '"SF Pro Display", "Arial Narrow", system-ui, sans-serif', letterSpacing: '-0.03em', fontStretch: 'condensed' },
    expanded: { fontFamily: '"SF Pro Display", system-ui, sans-serif', letterSpacing: '0.12em', fontStretch: 'expanded' },
    italic: { fontFamily: '"SF Pro Display", system-ui, sans-serif', fontStyle: 'italic' },
    slab: { fontFamily: '"Rockwell", "Roboto Slab", "Courier New", serif', fontWeight: 700 },
    elegant: { fontFamily: '"Didot", "Playfair Display", "Bodoni MT", serif', letterSpacing: '0.04em' },
    handwritten: { fontFamily: '"Bradley Hand", "Segoe Script", "Comic Sans MS", cursive' },
    geometric: { fontFamily: '"Futura", "Century Gothic", "Avant Garde", sans-serif' },
    classic: { fontFamily: '"Palatino", "Book Antiqua", "Garamond", serif' },
};

interface FontPickerProps {
    value: string;
    onChange: (fontId: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
    const [open, setOpen] = useState(false);

    const selectedFont = FONTS.find(f => f.id === value) || FONTS[0];

    return (
        <div className="relative">
            <label className="text-xs font-bold text-gray-400 px-4 uppercase block mb-1">Menu Font</label>
            <Card
                onClick={() => setOpen(!open)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-2xl group transition-all"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={fontStyleMap[selectedFont.id] || {}}
                    >
                        Aa
                    </div>
                    <div>
                        <p className="font-bold text-[15px]">{selectedFont.name}</p>
                    </div>
                </div>
                <svg className={`w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </Card>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white border border-gray-100 rounded-3xl shadow-2xl p-2 max-h-[400px] overflow-y-auto slide-down">
                        {FONTS.map(f => (
                            <div
                                key={f.id}
                                onClick={() => {
                                    onChange(f.id);
                                    setOpen(false);
                                }}
                                className={`px-4 py-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${value === f.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className="text-lg font-bold w-8 text-center"
                                        style={fontStyleMap[f.id] || {}}
                                    >
                                        Aa
                                    </span>
                                    <span className={`font-semibold text-[14px] ${value === f.id ? 'text-blue-600' : 'text-gray-700'}`}>
                                        {f.name}
                                    </span>
                                </div>
                                {value === f.id && (
                                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Helper to get font config for rendering
export const getFontConfig = (id: string) => {
    const f = FONTS.find(font => font.id === id) || FONTS[0];
    return {
        style: fontStyleMap[f.id] || fontStyleMap.system,
        name: f.name,
    };
};
