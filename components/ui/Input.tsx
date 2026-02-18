import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export function Input({ label, error, className = '', id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
                >
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700
          bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 
          focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff] focus:ring-opacity-20
          transition-all duration-200 outline-none
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}`}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}
