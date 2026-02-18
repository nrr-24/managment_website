import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
}

export function TextArea({ label, error, className = '', id, ...props }: TextAreaProps) {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={textareaId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                    {label}
                </label>
            )}
            <textarea
                id={textareaId}
                className={`w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-700 
          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 
          focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 
          transition-all duration-200 outline-none
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          ${className}`}
                rows={3}
                {...props}
            />
            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}
