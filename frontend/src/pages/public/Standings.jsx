import { useEffect, useMemo, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const StandingsTable = ({ rows, title, subtitle, testid }) => (
    <div className="bg-liv-card border border-liv-border overflow-x-auto">
        <div className="px-5 md:px-6 py-4 border-b border-liv-border flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl md:text-3xl uppercase tracking-wide" data-testid={`${testid}-title`}>{title}</h2>
            {subtitle ? <span className="text-xs md:text-sm text-neutral-400">{subtitle}</span> : null}
        </div>
        <table className="w-full text-sm" data-testid={testid}>
            <thead className="text-neutral-500 text-xs uppercase tracking-wider bg-liv-surface">
                <tr>
                    <th className="text-left px-4 py-4">#</th>
                    <th className="text-left py-4">Takım</th>
                    <th className="text-center py-4">O</th>
                    <th className="text-center py-4">G</th>
                    <th className="text-center py-4">B</th>
                    <th className="text-center py-4">M</th>
                    <th className="text-center py-4">AG</th>
                    <th className="text-center py-4">YG</th>
                    <th className="text-center py-4">Av</th>
                    <th className="text-center py-4 px-4 font-bold text-liv-yellow">P</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r) => {
                    const isLiv = r.team_name === "Livanespor";
                    return (
                        <tr key={r.id} className={`border-t border-liv-border ${isLiv ? "bg-liv-yellow/10 text-liv-yellow font-bold" : ""}`} data-testid={`${testid}-row-${r.rank}`}>
                            <td className="px-4 py-3 tabular-nums">{r.rank}</td>
                            <td className="py-3 font-semibold">{r.team_name}</td>
                            <td className="text-center py-3 tabular-nums">{r.played}</td>
                            <td className="text-center py-3 tabular-nums">{r.wins}</td>
                            <td className="text-center py-3 tabular-nums">{r.draws}</td>
                            <td className="text-center py-3 tabular-nums">{r.losses}</td>
                            <td className="text-center py-3 tabular-nums">{r.goals_for}</td>
                            <td className="text-center py-3 tabular-nums">{r.goals_against}</td>
                            <td className="text-center py-3 tabular-nums">{r.goal_difference}</td>
                            <td className="text-center py-3 px-4 tabular-nums font-bold">{r.points}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

const Standings = () => {
    const [rows, setRows] = useState([]);
    useEffect(() => { publicApi.standings().then(setRows); }, []);

    const groupRows = useMemo(() => rows.filter((r) => (r.league_group || "1.Grup") === "1.Grup"), [rows]);
    const playoffRows = useMemo(() => rows.filter((r) => r.league_group === "Play-Off"), [rows]);

    return (
        <PublicLayout>
            <SEO title="Puan Durumu · Livanespor" description="Süper Amatör Lig - Bursa 1.Grup ve Play-Off puan durumu." />
            <div className="container-x section-pad">
                <div className="overline">2025/2026 Sezonu</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Puan Durumu</h1>
                <p className="text-neutral-400 mt-3 max-w-2xl text-sm md:text-base">Süper Amatör Lig - Bursa düzenli sezon ve Play-Off sıralamaları. Veriler resmi maç sonuçlarından alınmıştır.</p>

                <div className="mt-10 space-y-10">
                    {groupRows.length > 0 && (
                        <StandingsTable
                            rows={groupRows}
                            title="Süper Amatör Lig - Bursa 1.Grup"
                            subtitle="Düzenli Sezon · 20 Hafta"
                            testid="standings-1grup"
                        />
                    )}
                    {playoffRows.length > 0 && (
                        <StandingsTable
                            rows={playoffRows}
                            title="Süper Amatör Lig - Bursa Play-Off"
                            subtitle="Play-Off Aşaması"
                            testid="standings-playoff"
                        />
                    )}
                </div>
            </div>
        </PublicLayout>
    );
};
export default Standings;
