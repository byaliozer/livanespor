import { useEffect } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { API } from "@/lib/api";

export const PublicLayout = ({ children, light = false }) => {
    useEffect(() => {
        // Inject dynamic theme CSS (primary/secondary/bg from site_settings)
        const id = "liv-theme-css";
        let link = document.getElementById(id);
        if (!link) {
            link = document.createElement("link");
            link.id = id;
            link.rel = "stylesheet";
            try {
                const origin = new URL(API).origin;
                link.href = `${origin}/api/public/theme.css?t=${Date.now()}`;
            } catch { link.href = `/api/public/theme.css`; }
            document.head.appendChild(link);
        }
    }, []);
    return (
        <div className={`min-h-screen flex flex-col ${light ? "bg-white text-black" : "bg-liv-black text-white"}`}>
            <Header />
            <main className="flex-1 pt-16 md:pt-20">{children}</main>
            <Footer />
        </div>
    );
};

