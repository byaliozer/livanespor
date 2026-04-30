import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/hooks/useReveal";
import { publicApi } from "@/lib/api";

const Team = () => {
    const [data, setData] = useState({ players: [], staff: [], next: null });
    useEffect(() => {
        Promise.all([publicApi.players(), publicApi.staff({ category: "a-team" }), publicApi.nextMatch()])
            .then(([players, staff, next]) => setData({ players, staff, next }));
    }, []);
    return (
        <PublicLayout>
            <SEO title="A Takım · Livanespor" description="Livanespor A Takım kadrosu, teknik ekip ve fikstür özeti." />
            <section className="relative h-[55vh] md:h-[70vh] bg-black overflow-hidden">
                <img src="https://images.pexels.com/photos/12616082/pexels-photo-12616082.jpeg" alt="A Takım" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 hero-overlay" />
                <div className="relative container-x h-full flex flex-col justify-end pb-12">
                    <div className="overline mb-2">Kulüp</div>
                    <h1 className="font-display text-6xl md:text-9xl uppercase">A Takım</h1>
                    <p className="mt-4 max-w-2xl text-neutral-300">2025-2026 sezonu kadromuz, teknik ekibimiz ve yaklaşan maçlarımız.</p>
                </div>
            </section>

            <div className="container-x section-pad">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
                    <div className="bg-liv-card border border-liv-border p-8">
                        <div className="overline">Kadro</div>
                        <div className="font-display text-7xl text-liv-yellow mt-2">{data.players.length}</div>
                        <div className="text-sm text-neutral-400 mt-1">Aktif Oyuncu</div>
                        <Link to="/oyuncular" className="mt-4 inline-block text-liv-yellow text-sm font-bold hover:underline">Tüm Oyuncular →</Link>
                    </div>
                    <div className="bg-liv-card border border-liv-border p-8">
                        <div className="overline">Teknik Ekip</div>
                        <div className="font-display text-7xl text-liv-yellow mt-2">{data.staff.length}</div>
                        <div className="text-sm text-neutral-400 mt-1">Antrenör & Yardımcı</div>
                        <Link to="/teknik-ekip" className="mt-4 inline-block text-liv-yellow text-sm font-bold hover:underline">Teknik Ekibe Git →</Link>
                    </div>
                    <div className="bg-liv-yellow text-black p-8">
                        <div className="text-xs font-bold uppercase tracking-[0.3em]">Sıradaki Maç</div>
                        {data.next?.id ? (
                            <>
                                <div className="font-display text-2xl sm:text-3xl mt-2 leading-tight break-words">{data.next.opponent}</div>
                                <div className="text-sm font-semibold mt-1">{new Date(data.next.match_date).toLocaleString("tr-TR")}</div>
                                <Link to="/mac-merkezi" className="mt-4 inline-block underline font-bold text-sm">Detay →</Link>
                            </>
                        ) : <div className="font-display text-2xl mt-2">Yakında açıklanacak</div>}
                    </div>
                </div>
                <Reveal>
                    <h2 className="font-display text-5xl uppercase mb-8">Kadromuz</h2>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {data.players.map((p) => (
                        <Link key={p.id} to={`/oyuncular/${p.slug}`} className="group bg-liv-card border border-liv-border hover:border-liv-yellow">
                            <div className="aspect-[3/4] relative overflow-hidden">
                                <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-2 right-2 font-display text-2xl text-liv-yellow">#{p.jersey_number}</div>
                            </div>
                            <div className="p-2">
                                <div className="text-[10px] uppercase text-liv-yellow">{p.position}</div>
                                <div className="font-semibold text-sm">{p.name}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
};
export default Team;
