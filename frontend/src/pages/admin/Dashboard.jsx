import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/lib/api";
import { formatDateTR, formatTimeTR } from "@/lib/dateFormat";
import {
    Trophy, Calendar, Cake, Mail, Newspaper, Sparkles,
    Plus, Wand2, RefreshCw, Package,
    UserCog, Users, ClipboardList,
} from "lucide-react";

// Eski tarz büyük StatCard
const StatCard = ({ icon: Icon, label, value, accent = false, to }) => (
    <Link to={to || "#"} className={`block p-6 border ${accent ? "bg-liv-yellow text-black border-liv-yellow hover:bg-liv-yellow/90" : "bg-liv-card border-liv-border hover:border-liv-yellow"} transition-colors rounded-md`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <Icon className={`w-6 h-6 ${accent ? "text-black" : "text-liv-yellow"}`} />
        <div className={`font-display text-5xl mt-3 ${accent ? "text-black" : "text-white"}`}>{value ?? 0}</div>
        <div className={`text-xs uppercase tracking-widest mt-1 ${accent ? "text-black/70" : "text-neutral-400"}`}>{label}</div>
    </Link>
);

// Son 5 maç rozet
const ResultBadge = ({ r }) => {
    const map = { G: "bg-liv-yellow text-black", B: "bg-neutral-700 text-white", M: "bg-red-600 text-white" };
    return <div className={`w-7 h-7 ${map[r] || "bg-neutral-800 text-neutral-500"} flex items-center justify-center text-xs font-bold`}>{r || "—"}</div>;
};

// Üst hero card
const LeagueHero = ({ ls }) => {
    if (!ls) {
        return (
            <Link to="/admin/mackolik" className="block border border-liv-yellow/40 bg-gradient-to-br from-liv-yellow/[0.05] to-transparent p-6 md:p-8 hover:border-liv-yellow transition" data-testid="dashboard-league-hero-empty">
                <div className="flex items-center gap-3 mb-3"><Trophy className="w-5 h-5 text-liv-yellow" /><span className="overline">Lig Durumu</span></div>
                <p className="text-neutral-400 text-sm">Lig sıralama verisi yok. Mackolik Sync'i yapılandırarak otomatik çekebilirsiniz veya Puan Durumu sayfasından elle ekleyebilirsiniz.</p>
                <div className="text-xs uppercase tracking-widest text-liv-yellow mt-3">Yapılandır →</div>
            </Link>
        );
    }
    return (
        <div className="border border-liv-yellow/40 bg-gradient-to-br from-liv-yellow/[0.05] to-transparent p-6 md:p-8" data-testid="dashboard-league-hero">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2"><Trophy className="w-4 h-4 text-liv-yellow" /><span className="overline">Lig Durumu</span></div>
                    <h2 className="font-display text-3xl md:text-4xl uppercase">{ls.group_name || "Bilinmiyor"} {ls.season && <span className="text-neutral-500 text-2xl">· {ls.season}</span>}</h2>
                </div>
                <Link to="/admin/standings" className="text-xs uppercase tracking-wider text-neutral-400 hover:text-liv-yellow border border-liv-border px-3 py-1.5">Sırayı Güncelle</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                    <div className="font-display text-7xl md:text-8xl text-liv-yellow leading-none">{ls.rank ?? "—"}<span className="text-3xl text-liv-yellow/50">.</span></div>
                    <div className="text-xs uppercase tracking-widest text-neutral-500 mt-2">Sıralama {ls.total_teams ? `· /${ls.total_teams}` : ""}</div>
                </div>
                <div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-display text-6xl text-white">{ls.points ?? 0}</span>
                        <span className="text-xs uppercase tracking-widest text-neutral-500">Puan</span>
                    </div>
                    <div className="text-sm text-neutral-300 mt-3">
                        <strong>{ls.played ?? 0}</strong> maç · Averaj <strong className={ls.goal_diff >= 0 ? "text-liv-yellow" : "text-red-500"}>{ls.goal_diff > 0 ? "+" : ""}{ls.goal_diff ?? 0}</strong>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">{ls.goals_for ?? 0} atılan · {ls.goals_against ?? 0} yenilen</div>
                </div>
                <div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-liv-card border border-liv-border p-3 text-center"><div className="font-display text-3xl text-liv-yellow">{ls.wins ?? 0}</div><div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">G</div></div>
                        <div className="bg-liv-card border border-liv-border p-3 text-center"><div className="font-display text-3xl text-white">{ls.draws ?? 0}</div><div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">B</div></div>
                        <div className="bg-liv-card border border-liv-border p-3 text-center"><div className="font-display text-3xl text-red-500">{ls.losses ?? 0}</div><div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">M</div></div>
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Son 5 Maç</div>
                    <div className="flex gap-1.5">
                        {Array.from({ length: 5 }).map((_, i) => <ResultBadge key={i} r={ls.last_5?.[i]} />)}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Küçük kart (gösterimi şu an sadece secondary panellerde kullanılıyor)
const QuickAction = ({ icon: Icon, label, to }) => (
    <Link to={to} className="flex items-center gap-3 p-3 bg-liv-card border border-liv-border hover:border-liv-yellow hover:bg-liv-yellow/[0.04] transition rounded-md" data-testid={`quick-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="w-8 h-8 bg-liv-yellow/20 flex items-center justify-center"><Icon className="w-4 h-4 text-liv-yellow" /></div>
        <span className="text-sm text-neutral-200">{label}</span>
    </Link>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    useEffect(() => { adminApi.stats().then(setStats); }, []);
    if (!stats) return <div className="text-neutral-400" data-testid="dashboard-loading">Yükleniyor…</div>;

    const sub = stats.subscription || {};
    const macko = stats.mackolik || {};
    const usedPct = sub.monthly_credit_limit ? Math.round(((sub.monthly_credit_limit - sub.credit_balance) / sub.monthly_credit_limit) * 100) : 0;
    const upcoming = stats.upcoming_matches_list || [];

    return (
        <div className="space-y-8" data-testid="admin-dashboard">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Panel</div>
                    <h1 className="font-display text-5xl md:text-6xl uppercase mt-1">Genel Bakış</h1>
                </div>
            </div>

            {/* Top hero: League status */}
            <LeagueHero ls={stats.league_status} />

            {/* 5 büyük StatCard — istek: Yaklaşan Maç / Doğum Günü / Toplam Haber / Sponsor / Mesaj */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon={Trophy} label="Yaklaşan Maç" value={stats.upcoming_matches} to="/admin/matches" accent />
                <StatCard icon={Cake} label="Yaklaşan Doğum Günü" value={(stats.upcoming_birthdays || []).length} to="/admin/players" />
                <StatCard icon={Newspaper} label="Toplam Haber" value={stats.posts_total} to="/admin/posts" />
                <StatCard icon={Sparkles} label="Sponsor" value={stats.sponsors_active} to="/admin/sponsors" />
                <StatCard icon={Mail} label="Okunmamış Mesaj" value={stats.messages_unread} to="/admin/messages" />
            </div>

            {/* Subscription + Mackolik (compact) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Link to="/admin/paketim" className="bg-liv-card border border-liv-border hover:border-liv-yellow p-5 transition rounded-md" data-testid="dashboard-subscription-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="overline">Aktif Paket</div>
                            <div className="font-display text-2xl uppercase text-liv-yellow mt-0.5">{sub.plan_display_name || "—"}</div>
                        </div>
                        <Package className="w-7 h-7 text-liv-yellow/70" />
                    </div>
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-neutral-400 mb-1">
                            <span>Kalan Kredi</span>
                            <span><strong className="text-white">{sub.credit_balance ?? "-"}</strong> / {sub.monthly_credit_limit ?? "-"}</span>
                        </div>
                        <div className="h-1.5 bg-liv-black border border-liv-border overflow-hidden"><div className="h-full bg-liv-yellow" style={{ width: `${100 - usedPct}%` }} /></div>
                    </div>
                </Link>
                <Link to="/admin/mackolik" className="bg-liv-card border border-liv-border hover:border-liv-yellow p-5 transition rounded-md" data-testid="dashboard-mackolik-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="overline">Mackolik Senkronizasyon</div>
                            <div className="font-display text-2xl uppercase mt-0.5">{macko.team_display_name || "Yapılandırılmadı"}</div>
                        </div>
                        <RefreshCw className="w-7 h-7 text-liv-yellow/70" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div><div className="text-neutral-500">Durum</div><div className={`font-semibold ${macko.last_sync_status === "success" ? "text-green-400" : macko.last_sync_status === "error" ? "text-red-400" : "text-neutral-300"}`}>{macko.last_sync_status ? macko.last_sync_status.toUpperCase() : "—"}</div></div>
                        <div><div className="text-neutral-500">Son Sync</div><div className="font-semibold text-neutral-200">{macko.last_sync_at ? new Date(macko.last_sync_at).toLocaleString("tr-TR") : "—"}</div></div>
                    </div>
                </Link>
            </div>

            {/* Bottom: Yaklaşan maçlar + Hızlı aksiyonlar + Doğum günleri */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Yaklaşan Maçlar */}
                <div className="lg:col-span-2 bg-liv-card border border-liv-border p-6 rounded-md" data-testid="dashboard-upcoming-matches">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-2xl uppercase">Yaklaşan Maçlar</h2>
                        <Link to="/admin/matches" className="text-xs uppercase tracking-wider text-liv-yellow hover:underline">Tümünü gör →</Link>
                    </div>
                    {upcoming.length === 0 && <div className="text-sm text-neutral-500 py-4">Yaklaşan maç yok. Maçlar sayfasından ekleyin veya Mackolik Sync'i çalıştırın.</div>}
                    <div className="space-y-2">
                        {upcoming.map((m) => (
                            <div key={m.id} className="flex items-center justify-between gap-3 border-b border-liv-border/40 pb-3 last:border-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 bg-liv-yellow/15 border border-liv-yellow/30 flex items-center justify-center flex-shrink-0"><Calendar className="w-4 h-4 text-liv-yellow" /></div>
                                    <div className="min-w-0">
                                        <div className="text-sm text-neutral-100 truncate"><strong>{m.home_team}</strong> <span className="text-neutral-500">vs</span> <strong>{m.away_team}</strong></div>
                                        <div className="text-xs text-neutral-500">{formatDateTR(m.match_date)} · {formatTimeTR(m.match_date)} · {m.venue || "—"}</div>
                                    </div>
                                </div>
                                <Link to={`/admin/ai-studio?match=${m.id}`} className="text-xs uppercase tracking-wider text-neutral-300 border border-liv-border hover:border-liv-yellow hover:text-liv-yellow px-3 py-1.5 flex-shrink-0">Görsel Oluştur</Link>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hızlı Aksiyonlar */}
                <div className="bg-liv-card border border-liv-border p-6 rounded-md" data-testid="dashboard-quick-actions">
                    <h2 className="font-display text-2xl uppercase mb-4">Hızlı Aksiyonlar</h2>
                    <div className="space-y-2">
                        <QuickAction icon={Plus} label="Yeni Maç Ekle" to="/admin/matches" />
                        <QuickAction icon={Calendar} label="Maç Haftası Görseli" to="/admin/ai-studio" />
                        <QuickAction icon={Wand2} label="AI Stüdyo" to="/admin/ai-studio" />
                        <QuickAction icon={Newspaper} label="Yeni Haber" to="/admin/posts" />
                        <QuickAction icon={Users} label="Yeni Oyuncu" to="/admin/players" />
                        <QuickAction icon={Sparkles} label="Yeni Sponsor" to="/admin/sponsors" />
                        <QuickAction icon={RefreshCw} label="Mackolik Sync" to="/admin/mackolik" />
                    </div>
                </div>
            </div>

            {/* Doğum günleri + Başvurular + Mesajlar (compact) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-liv-card border border-liv-border p-6 rounded-md" data-testid="dashboard-birthdays">
                    <h2 className="font-display text-xl uppercase mb-4 flex items-center gap-2"><Cake className="w-4 h-4 text-liv-yellow" /> Yaklaşan Doğum Günleri</h2>
                    {(stats.upcoming_birthdays || []).length === 0 ? (
                        <div className="text-xs text-neutral-500">30 gün içinde doğum günü olan oyuncu yok.</div>
                    ) : (
                        <div className="space-y-2">
                            {stats.upcoming_birthdays.slice(0, 4).map((b) => (
                                <Link key={b.id} to="/admin/players" className="flex items-center gap-3 hover:text-liv-yellow">
                                    <div className="w-8 h-8 bg-liv-black border border-liv-border overflow-hidden flex-shrink-0">
                                        {b.photo_url ? <img src={b.photo_url} alt={b.name} className="w-full h-full object-cover" /> : <UserCog className="w-4 h-4 text-neutral-600 m-auto mt-2" />}
                                    </div>
                                    <div className="flex-1 min-w-0 text-sm"><div className="truncate">{b.name}</div><div className="text-[11px] text-neutral-500">{b.upcoming_date?.slice(5)} · {b.turning_age} yaş</div></div>
                                    <div className="text-right text-xs"><div className="font-display text-lg text-liv-yellow leading-none">{b.days_until}</div><div className="text-[9px] text-neutral-500 uppercase">gün</div></div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-liv-card border border-liv-border p-6 rounded-md">
                    <h2 className="font-display text-xl uppercase mb-4 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-liv-yellow" /> Son Başvurular</h2>
                    {stats.recent_applications.length === 0 ? <div className="text-xs text-neutral-500">Başvuru yok.</div> : (
                        <div className="space-y-2">
                            {stats.recent_applications.slice(0, 4).map((a) => (
                                <Link key={a.id} to="/admin/applications" className="block text-sm hover:text-liv-yellow">
                                    <div className="truncate">{a.player_name} <span className="text-xs text-neutral-500">({a.age_group || "-"})</span></div>
                                    <div className="text-[11px] text-neutral-500 truncate">{a.parent_name} · {a.phone}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-liv-card border border-liv-border p-6 rounded-md">
                    <h2 className="font-display text-xl uppercase mb-4 flex items-center gap-2"><Mail className="w-4 h-4 text-liv-yellow" /> Son Mesajlar</h2>
                    {stats.recent_messages.length === 0 ? <div className="text-xs text-neutral-500">Mesaj yok.</div> : (
                        <div className="space-y-2">
                            {stats.recent_messages.slice(0, 4).map((m) => (
                                <Link key={m.id} to="/admin/messages" className="block text-sm hover:text-liv-yellow">
                                    <div className="truncate">{m.name || "İsimsiz"}</div>
                                    <div className="text-[11px] text-neutral-500 truncate">{m.subject || m.message?.slice(0, 60)}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Sezon Form + Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sezon Form Grafiği — son 10 maç */}
                <div className="lg:col-span-2 bg-liv-card border border-liv-border p-6 rounded-md" data-testid="dashboard-form-chart">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-display text-2xl uppercase">Sezon Form (Son 10 Maç)</h2>
                        {stats.season_form_summary && (
                            <div className="text-xs text-neutral-400">
                                <span className="text-liv-yellow font-bold">{stats.season_form_summary.wins}G</span> · <span>{stats.season_form_summary.draws}B</span> · <span className="text-red-500">{stats.season_form_summary.losses}M</span> · {stats.season_form_summary.goals_for}-{stats.season_form_summary.goals_against}
                            </div>
                        )}
                    </div>
                    {(stats.season_form || []).length === 0 ? (
                        <div className="text-sm text-neutral-500 py-4">Henüz bitmiş maç yok.</div>
                    ) : (
                        <div className="flex items-end gap-2 h-32">
                            {stats.season_form.map((m) => {
                                const maxGoals = Math.max(...stats.season_form.map((x) => x.our_score + x.their_score), 1);
                                const ourH = (m.our_score / maxGoals) * 80 + 10;
                                const theirH = (m.their_score / maxGoals) * 80 + 10;
                                const colorMap = { W: "bg-liv-yellow", D: "bg-neutral-500", L: "bg-red-500" };
                                return (
                                    <div key={m.id} className="flex-1 flex flex-col items-center group cursor-pointer" title={`${formatDateTR(m.date)} · ${m.is_home ? "Ev" : "Dep"} vs ${m.opponent} · ${m.our_score}-${m.their_score}`}>
                                        <div className="w-full flex items-end justify-center gap-0.5 h-24">
                                            <div className={`w-1/2 ${colorMap[m.result]} group-hover:opacity-80 transition-opacity`} style={{ height: `${ourH}%` }} />
                                            <div className={`w-1/2 bg-neutral-700 group-hover:opacity-80`} style={{ height: `${theirH}%` }} />
                                        </div>
                                        <div className={`text-[10px] font-bold mt-1 ${m.result === "W" ? "text-liv-yellow" : m.result === "D" ? "text-neutral-300" : "text-red-500"}`}>{m.our_score}-{m.their_score}</div>
                                        <div className="text-[9px] text-neutral-500 truncate w-full text-center" title={m.opponent}>{(m.opponent || "").slice(0, 8)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <div className="text-[10px] text-neutral-600 mt-3 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-liv-yellow inline-block" /> Bizim gol</span>
                        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-neutral-700 inline-block" /> Rakip gol</span>
                    </div>
                </div>

                {/* Top Performers — Gol Kralı + Asist Kralı */}
                <div className="bg-liv-card border border-liv-border p-6 rounded-md" data-testid="dashboard-top-performers">
                    <h2 className="font-display text-2xl uppercase mb-4">En İyi Performans</h2>
                    <div className="mb-4">
                        <div className="text-xs uppercase tracking-widest text-liv-yellow mb-2 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Gol Kralı</div>
                        {(stats.top_performers?.scorers || []).length === 0 ? (
                            <div className="text-xs text-neutral-500">Henüz veri yok. Oyuncu istatistiklerini güncelleyin.</div>
                        ) : (
                            <div className="space-y-1.5">
                                {stats.top_performers.scorers.map((p, i) => (
                                    <Link key={p.id} to="/admin/players" className="flex items-center gap-2 group">
                                        <div className="text-xs text-neutral-500 w-4">{i + 1}.</div>
                                        <div className="w-7 h-7 bg-liv-black border border-liv-border overflow-hidden flex-shrink-0">
                                            {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : <UserCog className="w-3 h-3 text-neutral-600 m-auto mt-1" />}
                                        </div>
                                        <div className="flex-1 min-w-0 text-sm truncate group-hover:text-liv-yellow">{p.name}</div>
                                        <div className="font-display text-lg text-liv-yellow leading-none flex-shrink-0">{p.goals}</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-widest text-liv-yellow mb-2 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Asist Kralı</div>
                        {(stats.top_performers?.assists || []).length === 0 ? (
                            <div className="text-xs text-neutral-500">Henüz veri yok.</div>
                        ) : (
                            <div className="space-y-1.5">
                                {stats.top_performers.assists.map((p, i) => (
                                    <Link key={p.id} to="/admin/players" className="flex items-center gap-2 group">
                                        <div className="text-xs text-neutral-500 w-4">{i + 1}.</div>
                                        <div className="w-7 h-7 bg-liv-black border border-liv-border overflow-hidden flex-shrink-0">
                                            {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : <UserCog className="w-3 h-3 text-neutral-600 m-auto mt-1" />}
                                        </div>
                                        <div className="flex-1 min-w-0 text-sm truncate group-hover:text-liv-yellow">{p.name}</div>
                                        <div className="font-display text-lg text-liv-yellow leading-none flex-shrink-0">{p.assists}</div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminDashboard;
