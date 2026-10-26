import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Menus",
    description: "Choose a restaurant to view its menu",
};

export default function HubLayout({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-black">{children}</div>;
}
