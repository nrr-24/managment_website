import React from 'react';

interface ColorPickerProps {
    label?: string;
    value: string;
    onChange: (color: string) => void;
    className?: string;
}

export function ColorPicker({ label, value, onChange, className = '' }: ColorPickerProps) {
    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {label}
                </label>
            )}
            <div className="flex gap-3 items-center">
                <input
                    type="color"
                    value={value || '#0A84FF'}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-12 w-20 rounded-lg border-2 border-gray-300 dark:border-gray-700 cursor-pointer"
                />
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#0A84FF"
                    className="flex-1 px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
            transition-all duration-200 outline-none"
                />
            </div>
        </div>
    );
}
