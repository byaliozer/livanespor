import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const AcademySchedule = () => {
    const [sessions, setSessions] = useState([]);
    useEffect(() => { publicApi.academySessions().then(setSessions); }, []);
    return (
        <PublicLayout>
            <SEO title="Antrenman Takvimi · Akademi" description="Akademi haftalık antrenman takvimi." />
            <div className="container-x section-pad">
                <div className="overline">Akademi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Antrenman Takvimi</h1>
                <div className="mt-12 bg-liv-card border border-liv-border overflow-x-auto">
                    <table className="w-full text-sm" data-testid="academy-schedule-table">
                        <thead className="text-neutral-500 uppercase text-xs tracking-wider bg-liv-surface">
                            <tr>
                                <th className="text-left px-6 py-4">Yaş Grubu</th>
                                <th className="text-left py-4">Gün</th>
                                <th className="text-left py-4">Saat</th>
                                <th className="text-left py-4">Saha</th>
                                <th className="text-left py-4 px-6">Antrenör</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s) => (
                                <tr key={s.id} className="border-t border-liv-border">
                                    <td className="px-6 py-4 font-display text-2xl text-liv-yellow">{s.group_code}</td>
                                    <td className="py-4 font-semibold">{s.day_name}</td>
                                    <td className="py-4 font-mono">{s.time_range}</td>
                                    <td className="py-4 text-neutral-300">{s.field}</td>
                                    <td className="py-4 px-6 text-neutral-300">{s.coach}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </PublicLayout>
    );
};
export default AcademySchedule;
