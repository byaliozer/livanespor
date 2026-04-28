import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { Crown, Calendar, Ruler, Footprints, Trophy, Star } from "lucide-react";

const PlayerDetail = () => {
    const { slug } = useParams();
    const [p, setP] = useState(null);
    const [posts, setPosts] = useState([]);
    useEffect(() => {
        publicApi.player(slug).then(setP).catch(() => setP(false));
        publicApi.posts({ limit: 3 }).then(setPosts);
    }, [slug]);
    if (p === false) return <PublicLayout><div className="container-x section-pad"><h1 className="font-display text-5xl">Oyuncu bulunamadı</h1><Link to="/oyuncular" className="text-liv-yellow underline mt-4 block">← Tüm oyuncular</Link></div></PublicLayout>;
    if (!p) return <PublicLayout><div className="container-x section-pad text-neutral-400">Yükleniyor…</div></PublicLayout>;
    const stats = p.stats || {};
    return (
        <PublicLayout>
            <SEO title={`${p.name} · Livanespor`} description={p.bio} image={p.photo_url} />
            <section className="relative bg-black">
                <div className="container-x grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12 md:pt-16 pb-16">
                    <div className="lg:col-span-7 order-2 lg:order-1">
                        <div className="overline">{p.position}</div>
                        <div className="font-display text-[12vw] md:text-[10vw] leading-[0.85] uppercase mt-2 text-white">
                            {p.name}
                        </div>
                        <div className="font-display text-9xl text-liv-yellow mt-2">#{p.jersey_number}</div>
                        {p.is_captain && (
                            <div className="mt-4 inline-flex items-center gap-2 bg-liv-yellow text-black px-4 py-2 font-bold uppercase tracking-widest text-xs"><Crown className="w-4 h-4" /> Takım Kaptanı</div>
                        )}
                        <p className="mt-6 max-w-2xl text-neutral-300 leading-relaxed">{p.bio}</p>
                        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-liv-card border border-liv-border p-4"><div className="text-xs text-neutral-500 uppercase">Yaş</div><div className="font-display text-3xl text-liv-yellow mt-1">{p.age || "-"}</div></div>
                            <div className="bg-liv-card border border-liv-border p-4"><div className="text-xs text-neutral-500 uppercase">Boy</div><div className="font-display text-3xl text-liv-yellow mt-1">{p.height_cm || "-"}<span className="text-lg">cm</span></div></div>
                            <div className="bg-liv-card border border-liv-border p-4"><div className="text-xs text-neutral-500 uppercase">Ayak</div><div className="font-display text-3xl text-liv-yellow mt-1">{p.preferred_foot || "-"}</div></div>
                            <div className="bg-liv-card border border-liv-border p-4"><div className="text-xs text-neutral-500 uppercase">Doğum</div><div className="font-display text-3xl text-liv-yellow mt-1">{p.birth_year || "-"}</div></div>
                        </div>
                    </div>
                    <div className="lg:col-span-5 order-1 lg:order-2">
                        <div className="aspect-[3/4] bg-liv-card border border-liv-border overflow-hidden">
                            <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-liv-surface border-y border-liv-border">
                <div className="container-x py-16">
                    <h2 className="font-display text-4xl md:text-5xl uppercase mb-8">Sezon İstatistikleri</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { l: "Maç", v: stats.matches || 0 },
                            { l: "Gol", v: stats.goals || 0 },
                            { l: "Asist", v: stats.assists || 0 },
                            { l: "Sarı Kart", v: stats.yellow_cards || 0 },
                            { l: "Kırmızı", v: stats.red_cards || 0 },
                        ].map((s, i) => (
                            <div key={i} className="bg-liv-card border border-liv-border p-6 text-center">
                                <div className="font-display text-6xl md:text-7xl text-liv-yellow tabular-nums">{s.v}</div>
                                <div className="text-xs uppercase tracking-widest text-neutral-400 mt-2">{s.l}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <section className="container-x section-pad">
                <h2 className="font-display text-4xl uppercase mb-6">İlgili Haberler</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post) => (
                        <Link key={post.id} to={`/haberler/${post.slug}`} className="bg-liv-card border border-liv-border hover:border-liv-yellow group block">
                            <div className="aspect-video overflow-hidden"><img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                            <div className="p-4">
                                <div className="text-xs text-liv-yellow uppercase tracking-widest">{post.category}</div>
                                <div className="font-display text-xl mt-1 group-hover:text-liv-yellow">{post.title}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
        </PublicLayout>
    );
};
export default PlayerDetail;
