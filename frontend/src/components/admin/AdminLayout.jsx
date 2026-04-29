import { useEffect } from "react";
import { Link, useNavigate, useLocation, NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
    LayoutDashboard, Users, UserCog, Calendar, Trophy, Sparkles, Image,
    Newspaper, GraduationCap, ClipboardList, Settings, LogOut, Layers,
    Mail, Wand2, ShieldQuestion, KeyRound
} from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png";

const NAV = [
    { to: "/admin/dashboard", label: "Panel", icon: LayoutDashboard, group: "Genel" },
    { to: "/admin/slides", label: "Hero Slider", icon: Layers, group: "İçerik" },
    { to: "/admin/posts", label: "Haberler", icon: Newspaper, group: "İçerik" },
    { to: "/admin/players", label: "Oyuncular", icon: Users, group: "Kulüp" },
    { to: "/admin/staff", label: "Teknik Ekip", icon: UserCog, group: "Kulüp" },
    { to: "/admin/matches", label: "Maçlar", icon: Calendar, group: "Kulüp" },
    { to: "/admin/standings", label: "Puan Durumu", icon: Trophy, group: "Kulüp" },
    { to: "/admin/sponsors", label: "Sponsorlar", icon: Sparkles, group: "Kulüp" },
    { to: "/admin/academy-groups", label: "Yaş Grupları", icon: GraduationCap, group: "Akademi" },
    { to: "/admin/academy-sessions", label: "Antrenman Takvimi", icon: Calendar, group: "Akademi" },
    { to: "/admin/applications", label: "Başvurular", icon: ClipboardList, group: "Akademi" },
    { to: "/admin/messages", label: "Mesajlar", icon: Mail, group: "İletişim" },
    { to: "/admin/media", label: "Medya", icon: Image, group: "İçerik" },
    { to: "/admin/ai", label: "AI Görsel", icon: Wand2, group: "İçerik" },
    { to: "/admin/users", label: "Kullanıcılar", icon: ShieldQuestion, group: "Sistem" },
    { to: "/admin/account", label: "Hesap Ayarları", icon: KeyRound, group: "Sistem" },
    { to: "/admin/settings", label: "Site Ayarları", icon: Settings, group: "Sistem" },
];

const AdminLayout = ({ children }) => {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    useEffect(() => {
        if (!loading && !user) navigate("/admin", { replace: true });
    }, [loading, user, navigate]);

    if (loading) return <div className="min-h-screen bg-liv-black flex items-center justify-center text-neutral-400">Yükleniyor…</div>;
    if (!user) return null;

    const groups = NAV.reduce((acc, n) => { (acc[n.group] = acc[n.group] || []).push(n); return acc; }, {});

    return (
        <div className="min-h-screen bg-liv-black text-white flex" data-testid="admin-layout">
            <aside className="w-64 border-r border-liv-border bg-liv-surface min-h-screen sticky top-0 flex flex-col">
                <div className="p-5 border-b border-liv-border flex items-center gap-3">
                    <img src={LOGO_URL} alt="Livanespor" className="w-10 h-10" />
                    <div>
                        <div className="font-display text-xl leading-none">LİVANESPOR</div>
                        <div className="text-[10px] uppercase tracking-widest text-liv-yellow">Admin Panel</div>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 text-sm">
                    {Object.entries(groups).map(([group, items]) => (
                        <div key={group} className="mb-4">
                            <div className="text-[10px] uppercase tracking-widest text-neutral-500 px-2 mb-1">{group}</div>
                            {items.map((n) => {
                                const Icon = n.icon;
                                const active = pathname === n.to;
                                return (
                                    <NavLink
                                        key={n.to}
                                        to={n.to}
                                        className={`flex items-center gap-2.5 px-2 py-2 rounded transition-colors ${active ? "bg-liv-yellow text-black font-bold" : "text-neutral-300 hover:bg-liv-card hover:text-white"}`}
                                        data-testid={`admin-nav-${n.to.replace("/admin/", "")}`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {n.label}
                                    </NavLink>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="p-3 border-t border-liv-border">
                    <div className="px-2 py-2">
                        <div className="text-xs text-neutral-500">Giriş yapan</div>
                        <div className="text-sm font-semibold truncate">{user.name}</div>
                        <div className="text-[10px] text-liv-yellow uppercase tracking-widest">{user.role}</div>
                    </div>
                    <button onClick={() => { logout(); navigate("/admin"); }} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-neutral-300 hover:bg-liv-card hover:text-liv-yellow rounded" data-testid="admin-logout">
                        <LogOut className="w-4 h-4" /> Çıkış Yap
                    </button>
                    <Link to="/" className="w-full flex items-center gap-2 px-2 py-2 text-sm text-neutral-300 hover:bg-liv-card hover:text-liv-yellow rounded" target="_blank">
                        ↗ Siteyi Görüntüle
                    </Link>
                </div>
            </aside>
            <main className="flex-1 min-w-0">
                <div className="p-6 md:p-10">{children}</div>
            </main>
        </div>
    );
};

export default AdminLayout;
