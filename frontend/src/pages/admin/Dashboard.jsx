import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/api";
import { Newspaper, FileText, Users, Sparkles, Calendar, ClipboardList, Mail, Plus } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent = false, to }) => (
    <Link to={to || "#"} className={`block p-6 border ${accent ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border hover:border-liv-yellow"} transition-colors`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <Icon className={`w-6 h-6 ${accent ? "text-black" : "text-liv-yellow"}`} />
        <div className={`font-display text-5xl mt-3 ${accent ? "text-black" : "text-white"}`}>{value}</div>
        <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-black/70" : "text-neutral-400"}`}>{label}</div>
    </Link>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    useEffect(() => { adminApi.stats().then(setStats); }, []);
    if (!stats) return <div className="text-neutral-400">Yükleniyor…</div>;

    return (
        <div className="space-y-8" data-testid="admin-dashboard">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Panel</div>
                    <h1 className="font-display text-5xl md:text-6xl uppercase mt-1">Genel Bakış</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/admin/posts" className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 !text-xs"><Plus className="w-4 h-4" /> Haber Ekle</Link>
                    <Link to="/admin/players" className="btn-secondary !py-2 !px-4 !text-xs"><Plus className="w-4 h-4" /> Oyuncu Ekle</Link>
                    <Link to="/admin/ai" className="btn-secondary !py-2 !px-4 !text-xs">AI Görsel Üret</Link>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Newspaper} label="Toplam Haber" value={stats.posts_total} to="/admin/posts" />
                <StatCard icon={FileText} label="Yayınlanmış" value={stats.posts_published} to="/admin/posts" />
                <StatCard icon={FileText} label="Taslak" value={stats.posts_draft} to="/admin/posts" />
                <StatCard icon={Users} label="Aktif Oyuncu" value={stats.players_active} to="/admin/players" />
                <StatCard icon={Sparkles} label="Aktif Sponsor" value={stats.sponsors_active} to="/admin/sponsors" />
                <StatCard icon={Calendar} label="Yaklaşan Maç" value={stats.upcoming_matches} to="/admin/matches" />
                <StatCard icon={ClipboardList} label="Yeni Başvuru" value={stats.applications_new} accent to="/admin/applications" />
                <StatCard icon={Mail} label="Okunmamış Mesaj" value={stats.messages_unread} to="/admin/messages" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-liv-card border border-liv-border p-6">
                    <h2 className="font-display text-2xl uppercase mb-4">Son Başvurular</h2>
                    <div className="space-y-2">
                        {stats.recent_applications.length === 0 && <div className="text-sm text-neutral-500">Henüz başvuru yok.</div>}
                        {stats.recent_applications.map((a) => (
                            <Link key={a.id} to="/admin/applications" className="flex items-center justify-between border-b border-liv-border/50 py-2 hover:text-liv-yellow">
                                <div>
                                    <div className="font-semibold">{a.player_name} <span className="text-xs text-neutral-500">({a.age_group || "-"})</span></div>
                                    <div className="text-xs text-neutral-500">{a.parent_name} · {a.phone}</div>
                                </div>
                                <span className="text-xs uppercase tracking-widest text-liv-yellow">{a.status}</span>
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="bg-liv-card border border-liv-border p-6">
                    <h2 className="font-display text-2xl uppercase mb-4">Son Mesajlar</h2>
                    <div className="space-y-2">
                        {stats.recent_messages.length === 0 && <div className="text-sm text-neutral-500">Henüz mesaj yok.</div>}
                        {stats.recent_messages.map((m) => (
                            <Link key={m.id} to="/admin/messages" className="block border-b border-liv-border/50 py-2 hover:text-liv-yellow">
                                <div className="font-semibold">{m.name || "İsimsiz"}</div>
                                <div className="text-xs text-neutral-500 truncate">{m.subject || m.message?.slice(0, 60)}</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminDashboard;
