import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const Fixture = () => {
    const [matches, setMatches] = useState([]);
    const [filter, setFilter] = useState("all");
    useEffect(() => { publicApi.matches().then(setMatches); }, []);
    const list = matches.filter((m) => filter === "all" || m.status === filter);
    return (
        <PublicLayout>
            <SEO title="Fikstür · Livanespor" description="Livanespor 2025-2026 sezonu fikstür ve maç takvimi." />
            <div className="container-x section-pad">
                <div className="overline">Sezon</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Fikstür</h1>
                <div className="mt-8 flex gap-2">
                    {[["all", "Tümü"], ["upcoming", "Yaklaşan"], ["finished", "Tamamlanan"]].map(([k, l]) => (
                        <button key={k} onClick={() => setFilter(k)} className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${filter === k ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`} data-testid={`fixture-filter-${k}`}>{l}</button>
                    ))}
                </div>
                <div className="mt-10 space-y-3">
                    {list.map((m) => (
                        <div key={m.id} className="bg-liv-card border border-liv-border p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                            <div className="md:col-span-3 text-sm">
                                <div className="text-xs uppercase tracking-widest text-liv-yellow">{new Date(m.match_date).toLocaleDateString("tr-TR", { weekday: "long" })}</div>
                                <div className="font-display text-2xl mt-1">{new Date(m.match_date).toLocaleDateString("tr-TR")}</div>
                                <div className="text-xs text-neutral-400">{new Date(m.match_date).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                            <div className="md:col-span-6 font-display text-xl md:text-2xl">{m.home_team} <span className="text-neutral-500 mx-2">vs</span> {m.away_team}</div>
                            <div className="md:col-span-2 text-sm text-neutral-400">{m.venue}</div>
                            <div className="md:col-span-1 text-right">
                                {m.status === "finished" ? <span className="font-display text-2xl text-liv-yellow">{m.home_score}-{m.away_score}</span> : <span className="text-xs font-bold uppercase text-neutral-400">{m.status === "upcoming" ? "Yakında" : m.status}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
};
export default Fixture;
