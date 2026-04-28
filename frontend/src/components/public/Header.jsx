import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X, Phone } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png";

const NAV = [
    { to: "/", label: "Anasayfa" },
    { to: "/kulup", label: "Kulüp" },
    { to: "/takim", label: "A Takım" },
    { to: "/mac-merkezi", label: "Maç Merkezi" },
    { to: "/akademi", label: "Akademi" },
    { to: "/haberler", label: "Haberler" },
    { to: "/sponsorlar", label: "Sponsorlar" },
    { to: "/iletisim", label: "İletişim" },
];

export const Header = () => {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => { setOpen(false); }, [pathname]);

    return (
        <header
            data-testid="public-header"
            className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
                scrolled ? "bg-black/85 backdrop-blur-xl border-b border-white/10" : "bg-gradient-to-b from-black/70 to-transparent"
            }`}
        >
            <div className="container-x flex items-center justify-between h-16 md:h-20">
                <Link to="/" className="flex items-center gap-3 group" data-testid="header-logo">
                    <img src={LOGO_URL} alt="Livanespor" className="h-10 w-10 md:h-12 md:w-12 object-contain" />
                    <span className="font-display text-2xl md:text-3xl text-white group-hover:text-liv-yellow transition-colors">
                        LİVANESPOR
                    </span>
                </Link>

                <nav className="hidden lg:flex items-center gap-1" data-testid="header-nav">
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                            className={({ isActive }) =>
                                `px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-colors ${
                                    isActive ? "text-liv-yellow" : "text-white/80 hover:text-liv-yellow"
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-3">
                    <a href="tel:05437934101" className="flex items-center gap-2 text-sm text-white/70 hover:text-liv-yellow" data-testid="header-phone">
                        <Phone className="w-4 h-4" />
                        0543 793 4101
                    </a>
                    <Link to="/akademi/basvuru" className="btn-primary !py-2.5 !px-5 !text-xs" data-testid="header-cta-apply">
                        Akademi Başvurusu
                    </Link>
                </div>

                <button
                    className="lg:hidden text-white p-2"
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Menüyü aç/kapat"
                    data-testid="header-mobile-toggle"
                >
                    {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {open && (
                <div className="lg:hidden bg-black border-t border-white/10" data-testid="mobile-menu">
                    <div className="container-x py-4 flex flex-col gap-1">
                        {NAV.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === "/"}
                                className={({ isActive }) =>
                                    `block px-3 py-3 text-base font-semibold uppercase tracking-wider border-b border-white/5 ${
                                        isActive ? "text-liv-yellow" : "text-white/85"
                                    }`
                                }
                            >
                                {item.label}
                            </NavLink>
                        ))}
                        <Link to="/akademi/basvuru" className="btn-primary mt-3 w-full" data-testid="mobile-cta-apply">
                            Akademi Başvurusu
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
};
