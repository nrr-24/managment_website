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
            className={`bg-white rounded-2xl border border-gray-200/60 p-6 ${onClick ? 'cursor-pointer active:scale-[0.99] transition-all' : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
}
