import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const AcademyTechnical = () => {
    const [staff, setStaff] = useState([]);
    useEffect(() => { publicApi.staff({ category: "academy" }).then(setStaff); }, []);
    return (
        <PublicLayout>
            <SEO title="Akademi Teknik Kadro" description="Livanespor Akademi teknik direktörler ve antrenörler." />
            <div className="container-x section-pad">
                <div className="overline">Akademi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Teknik Kadro</h1>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {staff.map((s) => (
                        <div key={s.id} className="bg-liv-card border border-liv-border">
                            <div className="aspect-[4/3] overflow-hidden"><img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" /></div>
                            <div className="p-5">
                                <div className="text-xs text-liv-yellow uppercase tracking-widest">{s.role_title}</div>
                                <div className="font-display text-2xl mt-1">{s.name}</div>
                                <p className="mt-2 text-sm text-neutral-400">{s.bio}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
};
export default AcademyTechnical;
