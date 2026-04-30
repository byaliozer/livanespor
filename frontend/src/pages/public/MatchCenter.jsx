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
                    <div className="mt-12 bg-gradient-to-br from-liv-yellow to-yellow-500 text-black p-6 sm:p-8 md:p-12 relative overflow-hidden" data-testid="next-match-card">
                        <div className="absolute top-0 right-0 font-display text-[20vw] leading-none text-black/5 select-none pointer-events-none">NEXT</div>
                        <div className="relative">
                            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">Sıradaki Maç · {data.next.competition}</div>
                            <div className="font-display uppercase mt-3 leading-[0.95] tracking-tight grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] sm:items-baseline gap-x-4 gap-y-1 text-[clamp(2rem,7vw,4.5rem)]">
                                <span className="break-words">{data.next.home_team}</span>
                                <span className="text-black/40 sm:px-2">VS</span>
                                <span className="break-words sm:text-right">{data.next.away_team}</span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm font-semibold">
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 shrink-0" /> {new Date(data.next.match_date).toLocaleString("tr-TR")}</span>
                                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 shrink-0" /> {data.next.venue}</span>
                            </div>
                            <div className="mt-6 sm:mt-8"><Countdown targetIso={data.next.match_date} /></div>
                        </div>
                    </div>
                )}

                {data.last?.id && (
                    <div className="mt-8 bg-liv-card border border-liv-border p-6 sm:p-8 md:p-10">
                        <div className="overline">Son Maç</div>
                        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                            <div className="font-display uppercase break-words text-[clamp(1rem,4vw,2.25rem)] leading-tight">{data.last.home_team}</div>
                            <div className="font-display text-liv-yellow tabular-nums text-[clamp(1.75rem,7vw,4.5rem)] leading-none">{data.last.home_score} - {data.last.away_score}</div>
                            <div className="text-right font-display uppercase break-words text-[clamp(1rem,4vw,2.25rem)] leading-tight">{data.last.away_team}</div>
                        </div>
                        {data.last.summary ? <p className="mt-4 text-neutral-300 text-sm sm:text-base">{data.last.summary}</p> : null}
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
