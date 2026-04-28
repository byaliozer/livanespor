import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const AcademyAgeGroups = () => {
    const [groups, setGroups] = useState([]);
    useEffect(() => { publicApi.academyGroups().then(setGroups); }, []);
    return (
        <PublicLayout>
            <SEO title="Yaş Grupları · Akademi" description="U8 - U17 akademi yaş gruplarımız." />
            <div className="container-x section-pad">
                <div className="overline">Akademi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Yaş Grupları</h1>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map((g) => (
                        <div key={g.id} className="bg-liv-yellow text-black p-8 relative overflow-hidden" data-testid={`age-group-${g.name}`}>
                            <div className="font-display text-7xl md:text-9xl uppercase leading-none">{g.name}</div>
                            <div className="text-xs font-bold uppercase tracking-widest mt-2">{g.age_range}</div>
                            <p className="mt-4 text-sm">{g.description}</p>
                            <div className="mt-6 text-xs font-semibold uppercase">Antrenman: {g.training_days_summary}</div>
                            <Link to="/akademi/basvuru" className="mt-6 inline-flex items-center gap-2 bg-black text-liv-yellow px-5 py-2 font-bold uppercase tracking-widest text-xs hover:bg-neutral-900">Başvur →</Link>
                        </div>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
};
export default AcademyAgeGroups;
