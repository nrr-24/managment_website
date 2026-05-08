import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Menu",
    description: "View our delicious menu items",
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-black">
            {children}
        </div>
    );
}
