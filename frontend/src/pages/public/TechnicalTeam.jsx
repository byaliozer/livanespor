import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const TechnicalTeam = () => {
    const [staff, setStaff] = useState([]);
    useEffect(() => { publicApi.staff().then(setStaff); }, []);
    const aTeam = staff.filter((s) => s.category === "a-team");
    const academy = staff.filter((s) => s.category === "academy");
    const Group = ({ title, list }) => (
        <div>
            <div className="overline">{title}</div>
            <h2 className="font-display text-4xl md:text-5xl uppercase mt-2 mb-8">{title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {list.map((s) => (
                    <div key={s.id} className="bg-liv-card border border-liv-border" data-testid={`staff-${s.id}`}>
                        <div className="aspect-square overflow-hidden bg-neutral-900"><img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" /></div>
                        <div className="p-5">
                            <div className="text-xs text-liv-yellow uppercase tracking-widest">{s.role_title}</div>
                            <div className="font-display text-2xl mt-1">{s.name}</div>
                            <p className="mt-2 text-sm text-neutral-400">{s.bio}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
    return (
        <PublicLayout>
            <SEO title="Teknik Ekip · Livanespor" description="Livanespor teknik direktör, antrenörler ve yardımcı ekip kadrosu." />
            <div className="container-x section-pad space-y-16">
                {aTeam.length > 0 && <Group title="A Takım Teknik Ekibi" list={aTeam} />}
                {academy.length > 0 && <Group title="Akademi Teknik Ekibi" list={academy} />}
            </div>
        </PublicLayout>
    );
};
export default TechnicalTeam;
