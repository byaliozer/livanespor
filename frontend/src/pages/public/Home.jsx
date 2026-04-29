import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { HeroSlider } from "@/components/public/HeroSlider";
import { Reveal } from "@/hooks/useReveal";
import { CountUp, Countdown } from "@/components/CountUp";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { Calendar, MapPin, Trophy, Users, ArrowRight, Star, Crown, Target, Phone, Mail } from "lucide-react";

const POSITIONS = ["Tümü", "Kaleci", "Defans", "Orta Saha", "Forvet"];

const Home = () => {
    const [data, setData] = useState({
        slides: [], next: null, last: null, players: [], standings: [],
        upcoming: [], finished: [], posts: [], sponsors: [],
    });
    const [slidesLoading, setSlidesLoading] = useState(true);
    const [posFilter, setPosFilter] = useState("Tümü");

    useEffect(() => {
        // Load hero slides FIRST and IMMEDIATELY (highest priority)
        publicApi.heroSlides()
            .then((slides) => {
                setData((d) => ({ ...d, slides }));
                setSlidesLoading(false);
                // Preload first slide image as soon as we have URL
                if (slides[0]?.image_url) {
                    const img = new Image();
                    img.src = slides[0].image_url;
                }
            })
            .catch(() => setSlidesLoading(false));

        // Other data — non-blocking, lower priority
        Promise.all([
            publicApi.nextMatch(), publicApi.lastMatch(),
            publicApi.players(), publicApi.standings({ league_group: "1.Grup" }),
            publicApi.matches({ status: "upcoming" }), publicApi.matches({ status: "finished" }),
            publicApi.posts({ limit: 6 }), publicApi.sponsors(),
        ]).then(([next, last, players, standings, upcoming, finished, posts, sponsors]) => {
            setData((d) => ({ ...d, next, last, players, standings, upcoming, finished, posts, sponsors }));
        }).catch((e) => console.error(e));
    }, []);

    const featuredPlayers = data.players.filter((p) => p.is_featured || p.is_captain || p.top_scorer || p.top_assist).slice(0, 4);
    const filteredPlayers = posFilter === "Tümü" ? data.players : data.players.filter((p) => p.position === posFilter);

    return (
        <PublicLayout>
            <SEO title="Livanespor — Resmi Web Sitesi" description="Bursa Nilüfer'in resmi futbol kulübü Livanespor. A Takım, Akademi, Haberler, Maç Merkezi." image={data.slides[0]?.image_url} />
            <HeroSlider slides={data.slides} loading={slidesLoading} />

            {/* Quick metrics */}
            <section className="bg-liv-surface border-y border-liv-border" data-testid="quick-metrics">
                <div className="container-x py-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    {[
                        { label: "Aktif Oyuncu", value: data.players.length, suffix: "" },
                        { label: "Sezon Maçı", value: data.upcoming.length + data.finished.length, suffix: "" },
                        { label: "Lig Sıralaması", value: (data.standings.find((s) => s.team_name === "Livanespor")?.rank) || 1, suffix: "." },
                        { label: "Akademi Yaş Grubu", value: 6, suffix: "" },
                    ].map((m, i) => (
                        <div key={i} className="text-center md:text-left" data-testid={`metric-${i}`}>
                            <div className="font-display text-6xl md:text-8xl text-liv-yellow leading-none">
                                <CountUp end={m.value} suffix={m.suffix} />
                            </div>
                            <div className="mt-2 text-xs md:text-sm uppercase tracking-widest text-neutral-400">{m.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Next match + Last match */}
            <section className="container-x section-pad" data-testid="match-section">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Next Match */}
                    <Reveal className="lg:col-span-7">
                        <div className="bg-gradient-to-br from-liv-yellow to-yellow-500 text-black p-8 md:p-12 relative overflow-hidden h-full" data-testid="next-match-card">
                            <div className="absolute top-0 right-0 font-display text-[20vw] leading-none text-black/5 select-none pointer-events-none">NEXT</div>
                            <div className="relative">
                                <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4">Sıradaki Maç · {data.next?.competition || "BAL Ligi"}</div>
                                {data.next?.id ? (
                                    <>
                                        <div className="font-display text-5xl md:text-7xl uppercase leading-none">
                                            {data.next.home_team}
                                            <span className="text-black/50 mx-3 md:mx-5">VS</span>
                                            {data.next.away_team}
                                        </div>
                                        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
                                            <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(data.next.match_date).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" })}</div>
                                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {data.next.venue}</div>
                                        </div>
                                        <div className="mt-8">
                                            <Countdown targetIso={data.next.match_date} />
                                        </div>
                                        <div className="mt-8 flex flex-wrap gap-3">
                                            <Link to="/mac-merkezi" className="inline-flex items-center gap-2 bg-black text-liv-yellow px-6 py-3 font-bold uppercase tracking-wider text-sm hover:bg-neutral-900" data-testid="next-match-cta">
                                                Maç Detayı <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </>
                                ) : (
                                    <div className="font-display text-4xl">Henüz planlı maç yok</div>
                                )}
                            </div>
                        </div>
                    </Reveal>

                    {/* Last match */}
                    <Reveal delay={120} className="lg:col-span-5">
                        <div className="bg-liv-card border border-liv-border p-8 md:p-10 h-full flex flex-col" data-testid="last-match-card">
                            <div className="overline mb-4">Son Maç Sonucu</div>
                            {data.last?.id ? (
                                <>
                                    <div className="text-sm text-neutral-400">{data.last.competition} · {new Date(data.last.match_date).toLocaleDateString("tr-TR")}</div>
                                    <div className="my-6 flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="text-xs uppercase text-neutral-500 mb-1">Ev</div>
                                            <div className="font-display text-2xl md:text-3xl">{data.last.home_team}</div>
                                        </div>
                                        <div className="font-display text-5xl md:text-7xl text-liv-yellow tabular-nums">
                                            {data.last.home_score} - {data.last.away_score}
                                        </div>
                                        <div className="flex-1 text-right">
                                            <div className="text-xs uppercase text-neutral-500 mb-1">Deplasman</div>
                                            <div className="font-display text-2xl md:text-3xl">{data.last.away_team}</div>
                                        </div>
                                    </div>
                                    <p className="text-neutral-300 text-sm leading-relaxed">{data.last.summary}</p>
                                    <Link to="/mac-merkezi" className="mt-auto inline-flex items-center gap-2 text-liv-yellow font-bold uppercase tracking-wider text-sm hover:gap-3 transition-all">
                                        Tüm maçlar <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </>
                            ) : <div className="text-neutral-400">Henüz oynanmış maç yok.</div>}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Standings + mini fixture */}
            <section className="container-x section-pad pt-0" data-testid="standings-section">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Reveal className="lg:col-span-7">
                        <div className="bg-liv-card border border-liv-border p-6 md:p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <div className="overline">Lig</div>
                                    <h3 className="font-display text-3xl md:text-4xl mt-1">Puan Durumu</h3>
                                </div>
                                <Link to="/puan-durumu" className="text-sm text-liv-yellow hover:underline">Tümü →</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" data-testid="standings-table">
                                    <thead className="text-neutral-500 text-xs uppercase tracking-wider">
                                        <tr className="border-b border-liv-border">
                                            <th className="text-left py-3 pr-2">#</th>
                                            <th className="text-left py-3">Takım</th>
                                            <th className="text-center py-3">O</th>
                                            <th className="text-center py-3">G</th>
                                            <th className="text-center py-3">B</th>
                                            <th className="text-center py-3">M</th>
                                            <th className="text-center py-3">A</th>
                                            <th className="text-center py-3 font-bold text-liv-yellow">P</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.standings.slice(0, 8).map((row) => {
                                            const isLiv = row.team_name === "Livanespor";
                                            return (
                                                <tr key={row.id} className={`border-b border-liv-border/50 ${isLiv ? "bg-liv-yellow/10 text-liv-yellow font-bold" : ""}`}>
                                                    <td className="py-3 pr-2 tabular-nums">{row.rank}</td>
                                                    <td className="py-3 font-semibold">{row.team_name}</td>
                                                    <td className="py-3 text-center tabular-nums">{row.played}</td>
                                                    <td className="py-3 text-center tabular-nums">{row.wins}</td>
                                                    <td className="py-3 text-center tabular-nums">{row.draws}</td>
                                                    <td className="py-3 text-center tabular-nums">{row.losses}</td>
                                                    <td className="py-3 text-center tabular-nums">{row.goal_difference}</td>
                                                    <td className="py-3 text-center tabular-nums font-bold">{row.points}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={120} className="lg:col-span-5 space-y-6">
                        <div className="bg-liv-card border border-liv-border p-6 md:p-8">
                            <div className="overline">Yaklaşan</div>
                            <h3 className="font-display text-3xl mt-1 mb-4">Mini Fikstür</h3>
                            <div className="space-y-3">
                                {data.upcoming.slice(0, 3).map((m) => (
                                    <div key={m.id} className="border-l-2 border-liv-yellow pl-3 py-1" data-testid={`mini-fixture-${m.id}`}>
                                        <div className="text-xs text-neutral-400">{new Date(m.match_date).toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" })}</div>
                                        <div className="font-semibold">{m.home_team} <span className="text-neutral-500">vs</span> {m.away_team}</div>
                                        <div className="text-xs text-neutral-500">{m.venue}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-liv-card border border-liv-border p-6 md:p-8">
                            <div className="overline">Son 3 Sonuç</div>
                            <div className="mt-3 space-y-2">
                                {data.finished.slice(0, 3).map((m) => {
                                    const won = m.is_home ? m.home_score > m.away_score : m.away_score > m.home_score;
                                    const drew = m.home_score === m.away_score;
                                    const tag = drew ? "B" : won ? "G" : "M";
                                    const cls = drew ? "bg-neutral-600" : won ? "bg-liv-yellow text-black" : "bg-red-600";
                                    return (
                                        <div key={m.id} className="flex items-center justify-between py-2 border-b border-liv-border/50">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-7 h-7 inline-flex items-center justify-center font-bold text-xs ${cls}`}>{tag}</span>
                                                <span>{m.home_team} <span className="text-liv-yellow font-bold mx-1">{m.home_score}-{m.away_score}</span> {m.away_team}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Featured Players */}
            <section className="container-x section-pad" data-testid="featured-players">
                <Reveal>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                        <div>
                            <div className="overline">Yıldızlarımız</div>
                            <h2 className="font-display text-5xl md:text-7xl uppercase">Öne Çıkan Oyuncular</h2>
                        </div>
                        <Link to="/oyuncular" className="text-liv-yellow font-bold uppercase tracking-wider text-sm hover:underline">Tüm Kadro →</Link>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {featuredPlayers.map((p, i) => {
                        const tag = p.is_captain ? { l: "Kaptan", icon: Crown } : p.top_scorer ? { l: "Gol Kralı", icon: Target } : p.top_assist ? { l: "Asist Kralı", icon: Star } : { l: "Öne Çıkan", icon: Star };
                        const Icon = tag.icon;
                        return (
                            <Reveal key={p.id} delay={i * 80}>
                                <Link to={`/oyuncular/${p.slug}`} className="group block relative aspect-[3/4] bg-liv-card border border-liv-border overflow-hidden liv-card-glow transition-all" data-testid={`featured-player-${p.id}`}>
                                    <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                                    <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-liv-yellow text-black text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                                        <Icon className="w-3 h-3" /> {tag.l}
                                    </div>
                                    <div className="absolute top-3 right-3 font-display text-4xl text-liv-yellow drop-shadow-lg">#{p.jersey_number}</div>
                                    <div className="absolute bottom-0 inset-x-0 p-4">
                                        <div className="text-xs uppercase tracking-widest text-liv-yellow">{p.position}</div>
                                        <div className="font-display text-2xl md:text-3xl uppercase mt-1 leading-none">{p.name}</div>
                                    </div>
                                </Link>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* Squad Showcase with filters */}
            <section className="container-x section-pad pt-0" data-testid="squad-showcase">
                <Reveal>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                        <div>
                            <div className="overline">Kadro</div>
                            <h2 className="font-display text-5xl md:text-7xl uppercase">A Takım Vitrini</h2>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {POSITIONS.map((pos) => (
                                <button
                                    key={pos}
                                    onClick={() => setPosFilter(pos)}
                                    className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${posFilter === pos ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`}
                                    data-testid={`squad-filter-${pos.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                    {filteredPlayers.map((p, i) => (
                        <Link key={p.id} to={`/oyuncular/${p.slug}`} className="group bg-liv-card border border-liv-border hover:border-liv-yellow transition-colors" data-testid={`squad-card-${p.id}`}>
                            <div className="aspect-[3/4] relative overflow-hidden bg-neutral-900">
                                <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-2 right-2 font-display text-3xl text-liv-yellow">#{p.jersey_number}</div>
                            </div>
                            <div className="p-3">
                                <div className="text-[10px] uppercase tracking-widest text-liv-yellow">{p.position}</div>
                                <div className="font-bold text-sm mt-1 truncate">{p.name}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* News */}
            <section className="container-x section-pad" data-testid="home-news">
                <Reveal>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                        <div>
                            <div className="overline">Güncel</div>
                            <h2 className="font-display text-5xl md:text-7xl uppercase">Son Haberler</h2>
                        </div>
                        <Link to="/haberler" className="text-liv-yellow font-bold uppercase tracking-wider text-sm hover:underline">Tüm Haberler →</Link>
                    </div>
                </Reveal>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {data.posts.slice(0, 6).map((post, i) => (
                        <Reveal key={post.id} delay={i * 80}>
                            <Link to={`/haberler/${post.slug}`} className="block group bg-liv-card border border-liv-border hover:border-liv-yellow transition-all" data-testid={`news-card-${post.id}`}>
                                <div className="aspect-video overflow-hidden bg-black">
                                    <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-liv-yellow mb-2">
                                        <span>{post.category}</span>
                                        <span className="text-neutral-500">·</span>
                                        <span className="text-neutral-500">{new Date(post.published_at).toLocaleDateString("tr-TR")}</span>
                                    </div>
                                    <h3 className="font-display text-xl md:text-2xl uppercase leading-tight group-hover:text-liv-yellow transition-colors">{post.title}</h3>
                                    <p className="mt-3 text-sm text-neutral-400 line-clamp-3">{post.excerpt}</p>
                                </div>
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* Sponsors */}
            <section className="container-x section-pad pt-0" data-testid="home-sponsors">
                <Reveal>
                    <div className="text-center mb-12">
                        <div className="overline">Destekçilerimiz</div>
                        <h2 className="font-display text-5xl md:text-7xl uppercase">Sponsorlar</h2>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {data.sponsors.slice(0, 8).map((s, i) => (
                        <Reveal key={s.id} delay={i * 60}>
                            <a href={(s.website ? (s.website.startsWith("http") ? s.website : `https://${s.website}`) : "#")} target="_blank" rel="noreferrer" className="aspect-[16/9] bg-liv-card border border-liv-border hover:border-liv-yellow flex flex-col items-center justify-center p-6 transition-all liv-card-glow text-center" data-testid={`sponsor-${s.id}`}>
                                {s.logo_url ? (
                                    <img src={s.logo_url} alt={s.name} className="max-h-12 max-w-full object-contain" />
                                ) : (
                                    <span className="font-display text-2xl md:text-3xl text-white group-hover:text-liv-yellow">{s.name}</span>
                                )}
                                {s.logo_url && <span className="mt-2 text-xs font-display uppercase tracking-widest text-neutral-300">{s.name}</span>}
                                {s.website && <span className="mt-1 text-[10px] text-liv-yellow uppercase tracking-widest">{s.website.replace(/^https?:\/\//, '')}</span>}
                            </a>
                        </Reveal>
                    ))}
                </div>
                <div className="text-center mt-10">
                    <Link to="/sponsorlar" className="btn-secondary" data-testid="sponsors-cta">Tüm Sponsorlar</Link>
                </div>
            </section>

            {/* Facility / Contact strip */}
            <section className="container-x section-pad pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Reveal>
                        <div className="bg-liv-card border border-liv-border p-8 md:p-12 h-full">
                            <div className="overline">Tesis</div>
                            <h3 className="font-display text-4xl md:text-5xl mt-2 uppercase">Yolçatı Tesisimiz</h3>
                            <p className="mt-4 text-neutral-400 leading-relaxed">
                                Modern altyapı, profesyonel saha koşulları ve sıcak bir kulüp atmosferi. Antrenmanlarımız ve maçlarımız Yolçatı'da gerçekleşiyor.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <a href="https://maps.app.goo.gl/NKoYnqsX9hdp5k2T8" target="_blank" rel="noreferrer" className="btn-primary" data-testid="facility-directions">Yol Tarifi</a>
                                <Link to="/iletisim" className="btn-secondary">İletişim</Link>
                            </div>
                        </div>
                    </Reveal>
                    <Reveal delay={100}>
                        <div className="bg-liv-yellow text-black p-8 md:p-12 h-full">
                            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-2">Yönetici</div>
                            <h3 className="font-display text-5xl md:text-6xl uppercase">Ali Özer</h3>
                            <p className="mt-3 text-black/70">Kulüp Yöneticisi · Livanespor</p>
                            <div className="mt-6 space-y-3 text-sm font-semibold">
                                <a href="tel:05437934101" className="flex items-center gap-2 hover:underline" data-testid="contact-phone-link"><Phone className="w-4 h-4" /> 0543 793 4101</a>
                                <a href="mailto:bilgi@livanespor.org" className="flex items-center gap-2 hover:underline" data-testid="contact-email-link"><Mail className="w-4 h-4" /> bilgi@livanespor.org</a>
                                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Yolçatı, Nilüfer / Bursa</div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>
        </PublicLayout>
    );
};

export default Home;
