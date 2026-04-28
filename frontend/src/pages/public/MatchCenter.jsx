import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { Countdown } from "@/components/CountUp";
import { publicApi } from "@/lib/api";
import { Calendar, MapPin, Trophy } from "lucide-react";

const MatchCenter = () => {
    const [data, setData] = useState({ next: null, last: null, all: [] });
    useEffect(() => {
        Promise.all([publicApi.nextMatch(), publicApi.lastMatch(), publicApi.matches()])
            .then(([next, last, all]) => setData({ next, last, all }));
    }, []);
    return (
        <PublicLayout>
            <SEO title="Maç Merkezi · Livanespor" description="Sıradaki maç, son maç sonucu ve tüm fikstür." />
            <div className="container-x section-pad">
                <div className="overline">Maç Merkezi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">MAÇ MERKEZİ</h1>

                {data.next?.id && (
                    <div className="mt-12 bg-gradient-to-br from-liv-yellow to-yellow-500 text-black p-8 md:p-12 relative overflow-hidden">
                        <div className="absolute top-0 right-0 font-display text-[20vw] leading-none text-black/5 select-none">NEXT</div>
                        <div className="relative">
                            <div className="text-xs font-bold uppercase tracking-[0.3em]">Sıradaki Maç</div>
                            <div className="font-display text-5xl md:text-7xl uppercase mt-2 leading-none">{data.next.home_team} <span className="text-black/40 mx-3">VS</span> {data.next.away_team}</div>
                            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {new Date(data.next.match_date).toLocaleString("tr-TR")}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {data.next.venue}</span>
                                <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4" /> {data.next.competition}</span>
                            </div>
                            <div className="mt-8"><Countdown targetIso={data.next.match_date} /></div>
                        </div>
                    </div>
                )}

                {data.last?.id && (
                    <div className="mt-8 bg-liv-card border border-liv-border p-8 md:p-10">
                        <div className="overline">Son Maç</div>
                        <div className="mt-4 flex items-center justify-between gap-4">
                            <div className="flex-1 font-display text-2xl md:text-4xl uppercase">{data.last.home_team}</div>
                            <div className="font-display text-5xl md:text-7xl text-liv-yellow tabular-nums">{data.last.home_score} - {data.last.away_score}</div>
                            <div className="flex-1 text-right font-display text-2xl md:text-4xl uppercase">{data.last.away_team}</div>
                        </div>
                        <p className="mt-4 text-neutral-300">{data.last.summary}</p>
                    </div>
                )}

                <div className="mt-12">
                    <h2 className="font-display text-4xl uppercase mb-6">Tüm Maçlar</h2>
                    <div className="space-y-3">
                        {data.all.map((m) => (
                            <div key={m.id} className="bg-liv-card border border-liv-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-3" data-testid={`match-${m.id}`}>
                                <div className="flex-1">
                                    <div className="text-xs uppercase tracking-widest text-liv-yellow">{m.competition} · {new Date(m.match_date).toLocaleDateString("tr-TR")} {new Date(m.match_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                                    <div className="font-display text-xl md:text-2xl mt-1">{m.home_team} <span className="text-neutral-500">vs</span> {m.away_team}</div>
                                    <div className="text-sm text-neutral-400 mt-1">{m.venue}</div>
                                </div>
                                <div>
                                    {m.status === "finished" ? (
                                        <div className="font-display text-3xl md:text-4xl text-liv-yellow">{m.home_score} - {m.away_score}</div>
                                    ) : (
                                        <span className="px-3 py-1 text-xs font-bold uppercase tracking-widest border border-liv-yellow text-liv-yellow">{m.status === "upcoming" ? "Yaklaşan" : m.status}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
};
export default MatchCenter;
