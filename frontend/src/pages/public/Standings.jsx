import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const Standings = () => {
    const [rows, setRows] = useState([]);
    useEffect(() => { publicApi.standings().then(setRows); }, []);
    return (
        <PublicLayout>
            <SEO title="Puan Durumu · Livanespor" description="Lig puan durumu ve sıralama tablosu." />
            <div className="container-x section-pad">
                <div className="overline">Lig</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Puan Durumu</h1>
                <div className="mt-10 bg-liv-card border border-liv-border overflow-x-auto">
                    <table className="w-full text-sm" data-testid="full-standings-table">
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
                                <th className="text-center py-4 px-4 font-bold text-liv-yellow">Pts</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => {
                                const isLiv = r.team_name === "Livanespor";
                                return (
                                    <tr key={r.id} className={`border-t border-liv-border ${isLiv ? "bg-liv-yellow/10 text-liv-yellow font-bold" : ""}`}>
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
            </div>
        </PublicLayout>
    );
};
export default Standings;
