import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
}

export function Input({ label, error, hint, required, className = '', id, ...props }: InputProps) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-[13px] font-medium text-gray-500 mb-1.5"
                >
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <input
                id={inputId}
                className={`w-full h-12 px-5 rounded-2xl border border-gray-100
          bg-white text-gray-900
          focus:border-green-800 focus:ring-2 focus:ring-green-800/10
          transition-all duration-200 outline-none font-medium
          placeholder:text-gray-300
          disabled:opacity-40 disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/10' : ''}
          ${className}`}
                {...props}
            />
            {hint && !error && (
                <p className="mt-1.5 text-[12px] text-gray-400">{hint}</p>
            )}
            {error && (
                <p className="mt-1.5 text-[12px] text-red-500 font-medium">{error}</p>
            )}
        </div>
    );
}
