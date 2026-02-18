import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export function Card({ children, className = '', style, onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`bg-white dark:bg-[#1c1c1e] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 ${className} ${onClick ? 'cursor-pointer active:scale-[0.99] transition-all' : ''}`}
            style={style}
        >
            {children}
        </div>
    );
}
