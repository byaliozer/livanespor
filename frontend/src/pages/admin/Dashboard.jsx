import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/api";
import {
    Newspaper, FileText, Users, Sparkles, Calendar, ClipboardList, Mail,
    Plus, Cake, RefreshCw, Wand2, Image as ImageIcon, Package, UserCog, Trophy,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, accent = false, to }) => (
    <Link to={to || "#"} className={`block p-6 border ${accent ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border hover:border-liv-yellow"} transition-colors`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <Icon className={`w-6 h-6 ${accent ? "text-black" : "text-liv-yellow"}`} />
        <div className={`font-display text-5xl mt-3 ${accent ? "text-black" : "text-white"}`}>{value}</div>
        <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-black/70" : "text-neutral-400"}`}>{label}</div>
    </Link>
);

const QuickAction = ({ icon: Icon, label, to, variant = "primary" }) => (
    <Link to={to} className={`${variant === "primary" ? "btn-primary" : "btn-secondary"} !py-2 !px-4 inline-flex items-center gap-2 !text-xs`} data-testid={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <Icon className="w-4 h-4" /> {label}
    </Link>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    useEffect(() => { adminApi.stats().then(setStats); }, []);
    if (!stats) return <div className="text-neutral-400" data-testid="dashboard-loading">Yükleniyor…</div>;

    const sub = stats.subscription || {};
    const macko = stats.mackolik || {};
    const usedPct = sub.monthly_credit_limit ? Math.round(((sub.monthly_credit_limit - sub.credit_balance) / sub.monthly_credit_limit) * 100) : 0;

    return (
        <div className="space-y-8" data-testid="admin-dashboard">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Panel</div>
                    <h1 className="font-display text-5xl md:text-6xl uppercase mt-1">Genel Bakış</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <QuickAction icon={Plus} label="Haber Ekle" to="/admin/posts" />
                    <QuickAction icon={Plus} label="Oyuncu Ekle" to="/admin/players" variant="secondary" />
                    <QuickAction icon={Wand2} label="AI Stüdyo" to="/admin/ai-studio" variant="secondary" />
                    <QuickAction icon={RefreshCw} label="Mackolik Sync" to="/admin/mackolik" variant="secondary" />
                    <QuickAction icon={Package} label="Paketim" to="/admin/paketim" variant="secondary" />
                </div>
            </div>

            {/* Subscription + Mackolik summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Link to="/admin/paketim" className="bg-liv-card border border-liv-border hover:border-liv-yellow p-6 transition-colors" data-testid="dashboard-subscription-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="overline">Aktif Paket</div>
                            <div className="font-display text-4xl uppercase text-liv-yellow mt-1">{sub.plan_display_name || "—"}</div>
                        </div>
                        <Package className="w-10 h-10 text-liv-yellow/70" />
                    </div>
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                            <span>Kalan Kredi</span>
                            <span><strong className="text-white">{sub.credit_balance ?? "-"}</strong> / {sub.monthly_credit_limit ?? "-"}</span>
                        </div>
                        <div className="h-2 bg-liv-black border border-liv-border overflow-hidden">
                            <div className="h-full bg-liv-yellow" style={{ width: `${100 - usedPct}%` }} />
                        </div>
                        <div className="text-[10px] text-neutral-500 mt-2">Son yenileme: {sub.last_reset_year_month || "-"}</div>
                    </div>
                </Link>

                <Link to="/admin/mackolik" className="bg-liv-card border border-liv-border hover:border-liv-yellow p-6 transition-colors" data-testid="dashboard-mackolik-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="overline">Mackolik Senkronizasyon</div>
                            <div className="font-display text-2xl uppercase mt-1">{macko.team_display_name || "Yapılandırılmadı"}</div>
                        </div>
                        <RefreshCw className="w-10 h-10 text-liv-yellow/70" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <div className="text-neutral-500">Durum</div>
                            <div className={`font-semibold ${macko.last_sync_status === "success" ? "text-green-400" : macko.last_sync_status === "error" ? "text-red-400" : "text-neutral-300"}`}>
                                {macko.last_sync_status ? macko.last_sync_status.toUpperCase() : "—"}
                            </div>
                        </div>
                        <div>
                            <div className="text-neutral-500">Son Sync</div>
                            <div className="font-semibold text-neutral-200">{macko.last_sync_at ? new Date(macko.last_sync_at).toLocaleString("tr-TR") : "—"}</div>
                        </div>
                        {macko.last_sync_summary && (
                            <div className="col-span-2 text-neutral-400 text-[11px]">
                                Puan: {macko.last_sync_summary.standings || 0} · Fikstür: {macko.last_sync_summary.fixtures || 0} · Kadro: {macko.last_sync_summary.squad || 0}
                            </div>
                        )}
                    </div>
                </Link>
            </div>

            {/* Stat grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Newspaper} label="Toplam Haber" value={stats.posts_total} to="/admin/posts" />
                <StatCard icon={FileText} label="Yayınlanmış" value={stats.posts_published} to="/admin/posts" />
                <StatCard icon={FileText} label="Taslak" value={stats.posts_draft} to="/admin/posts" />
                <StatCard icon={Users} label="Aktif Oyuncu" value={stats.players_active} to="/admin/players" />
                <StatCard icon={Sparkles} label="Aktif Sponsor" value={stats.sponsors_active} to="/admin/sponsors" />
                <StatCard icon={Calendar} label="Yaklaşan Maç" value={stats.upcoming_matches} to="/admin/matches" />
                <StatCard icon={ClipboardList} label="Yeni Başvuru" value={stats.applications_new} accent to="/admin/applications" />
                <StatCard icon={Mail} label="Okunmamış Mesaj" value={stats.messages_unread} to="/admin/messages" />
                <StatCard icon={ImageIcon} label="Medya" value={stats.media_total || 0} to="/admin/media" />
                <StatCard icon={Cake} label="Yakın Doğum Günü" value={(stats.upcoming_birthdays || []).length} to="/admin/players" />
            </div>

            {/* Birthdays + Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-liv-card border border-liv-border p-6 lg:col-span-1" data-testid="dashboard-birthdays">
                    <h2 className="font-display text-2xl uppercase mb-4 flex items-center gap-2"><Cake className="w-5 h-5 text-liv-yellow" /> Yaklaşan Doğum Günleri</h2>
                    {(stats.upcoming_birthdays || []).length === 0 && (
                        <div className="text-sm text-neutral-500">Önümüzdeki 30 gün içinde doğum günü olan oyuncu yok. <br/><span className="text-xs">Oyuncu profilinde "Doğum Tarihi" alanını doldurun.</span></div>
                    )}
                    <div className="space-y-3">
                        {(stats.upcoming_birthdays || []).map((b) => (
                            <Link key={b.id} to="/admin/players" className="flex items-center gap-3 border-b border-liv-border/50 pb-2 last:border-0 hover:text-liv-yellow">
                                <div className="w-10 h-10 bg-liv-black border border-liv-border overflow-hidden flex-shrink-0">
                                    {b.photo_url ? <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" /> : <UserCog className="w-5 h-5 text-neutral-600 m-auto mt-2" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold truncate">{b.name} <span className="text-xs text-neutral-500">#{b.jersey_number}</span></div>
                                    <div className="text-xs text-neutral-500">{b.upcoming_date?.slice(5)} · {b.turning_age} yaşına giriyor</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-display text-xl text-liv-yellow">{b.days_until}</div>
                                    <div className="text-[10px] text-neutral-500 uppercase">gün</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="bg-liv-card border border-liv-border p-6 lg:col-span-1">
                    <h2 className="font-display text-2xl uppercase mb-4">Son Başvurular</h2>
                    <div className="space-y-2">
                        {stats.recent_applications.length === 0 && <div className="text-sm text-neutral-500">Henüz başvuru yok.</div>}
                        {stats.recent_applications.map((a) => (
                            <Link key={a.id} to="/admin/applications" className="flex items-center justify-between border-b border-liv-border/50 py-2 hover:text-liv-yellow">
                                <div className="min-w-0">
                                    <div className="font-semibold truncate">{a.player_name} <span className="text-xs text-neutral-500">({a.age_group || "-"})</span></div>
                                    <div className="text-xs text-neutral-500 truncate">{a.parent_name} · {a.phone}</div>
                                </div>
                                <span className="text-xs uppercase tracking-widest text-liv-yellow flex-shrink-0">{a.status}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                <div className="bg-liv-card border border-liv-border p-6 lg:col-span-1">
                    <h2 className="font-display text-2xl uppercase mb-4">Son Mesajlar</h2>
                    <div className="space-y-2">
                        {stats.recent_messages.length === 0 && <div className="text-sm text-neutral-500">Henüz mesaj yok.</div>}
                        {stats.recent_messages.map((m) => (
                            <Link key={m.id} to="/admin/messages" className="block border-b border-liv-border/50 py-2 hover:text-liv-yellow">
                                <div className="font-semibold truncate">{m.name || "İsimsiz"}</div>
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
