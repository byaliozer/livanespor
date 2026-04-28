import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { Search } from "lucide-react";

const POSITIONS = ["Tümü", "Kaleci", "Defans", "Orta Saha", "Forvet"];

const Players = () => {
    const [list, setList] = useState([]);
    const [pos, setPos] = useState("Tümü");
    const [q, setQ] = useState("");
    useEffect(() => { publicApi.players().then(setList); }, []);
    const filtered = list
        .filter((p) => pos === "Tümü" || p.position === pos)
        .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
    return (
        <PublicLayout>
            <SEO title="Oyuncular · Livanespor" description="Livanespor A Takım kadrosu — tüm oyuncular." />
            <div className="container-x section-pad">
                <div className="overline">Kadro</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Oyuncular</h1>
                <div className="mt-8 flex flex-col md:flex-row gap-4 md:items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {POSITIONS.map((p) => (
                            <button key={p} onClick={() => setPos(p)} className={`px-4 py-2 text-xs uppercase tracking-wider border transition-colors ${pos === p ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`} data-testid={`players-filter-${p.toLowerCase().replace(/\s+/g, "-")}`}>{p}</button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Oyuncu ara..." className="liv-input pl-10" data-testid="players-search" />
                    </div>
                </div>
                <div className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((p) => (
                        <Link key={p.id} to={`/oyuncular/${p.slug}`} className="group bg-liv-card border border-liv-border hover:border-liv-yellow transition-all" data-testid={`player-${p.id}`}>
                            <div className="aspect-[3/4] relative overflow-hidden bg-neutral-900">
                                <img src={p.photo_url} alt={p.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                <div className="absolute top-3 right-3 font-display text-4xl text-liv-yellow">#{p.jersey_number}</div>
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black p-3">
                                    <div className="text-[10px] uppercase tracking-widest text-liv-yellow">{p.position}</div>
                                    <div className="font-display text-2xl uppercase">{p.name}</div>
                                    <div className="text-xs text-neutral-400 mt-1">{p.age} yaş</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
                {filtered.length === 0 && <div className="text-neutral-400 mt-10 text-center">Sonuç bulunamadı.</div>}
            </div>
        </PublicLayout>
    );
};
export default Players;
