import { Header } from "./Header";
import { Footer } from "./Footer";

export const PublicLayout = ({ children, light = false }) => {
    return (
        <div className={`min-h-screen flex flex-col ${light ? "bg-white text-black" : "bg-liv-black text-white"}`}>
            <Header />
            <main className="flex-1 pt-16 md:pt-20">{children}</main>
            <Footer />
        </div>
    );
};
