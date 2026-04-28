import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { Globe, Instagram } from "lucide-react";

const LEVEL_LABELS = { main: "Ana Sponsor", forma: "Forma Sponsoru", jersey: "Forma Sponsoru", supporter: "Destekçi", corporate: "Kurumsal İş Ortağı" };
const SCOPE_LABELS = { club: "Kulüp", academy: "Akademi", both: "Kulüp & Akademi" };

const Sponsors = () => {
    const [list, setList] = useState([]);
    useEffect(() => { publicApi.sponsors().then(setList); }, []);
    const groupBy = (key) => list.reduce((acc, s) => { (acc[s[key]] = acc[s[key]] || []).push(s); return acc; }, {});
    const byLevel = groupBy("level");
    return (
        <PublicLayout>
            <SEO title="Sponsorlar · Livanespor" description="Livanespor sponsorları, forma sponsorları, destekçileri ve kurumsal iş ortakları." />
            <div className="container-x section-pad">
                <div className="overline">Destekçilerimiz</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Sponsorlar</h1>
                <p className="mt-6 max-w-3xl text-neutral-300 text-lg">Livanespor olarak yanımızda olan ve sarı-siyaha güç katan tüm sponsorlarımıza teşekkür ederiz.</p>

                {Object.entries(byLevel).map(([level, items]) => (
                    <section key={level} className="mt-16">
                        <h2 className="font-display text-3xl md:text-4xl uppercase mb-6">{LEVEL_LABELS[level] || level}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((s) => {
                                const igUrl = s.instagram?.startsWith("http") ? s.instagram : (s.instagram?.startsWith("@") ? `https://www.instagram.com/${s.instagram.slice(1)}` : (s.instagram ? `https://www.instagram.com/${s.instagram}` : ""));
                                return (
                                    <div key={s.id} className="bg-liv-card border border-liv-border hover:border-liv-yellow transition-all liv-card-glow group flex flex-col" data-testid={`sponsor-detail-${s.id}`}>
                                        <div className="p-8 flex items-center justify-center min-h-[140px] border-b border-liv-border/60">
                                            {s.logo_url ? (
                                                <img src={s.logo_url} alt={s.name} className="max-h-24 max-w-full object-contain" />
                                            ) : (
                                                <div className="font-display text-3xl md:text-4xl text-center group-hover:text-liv-yellow transition-colors">{s.name}</div>
                                            )}
                                        </div>
                                        <div className="p-5 flex-1 flex flex-col gap-2">
                                            {s.logo_url && <div className="font-display text-xl uppercase">{s.name}</div>}
                                            <div className="text-xs text-liv-yellow uppercase tracking-widest">{SCOPE_LABELS[s.scope] || s.scope}{s.age_group ? ` · ${s.age_group}` : ""}</div>
                                            {s.description && <p className="text-sm text-neutral-400">{s.description}</p>}
                                            <div className="mt-auto pt-3 flex flex-wrap gap-2">
                                                {s.website && (
                                                    <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 border border-liv-border hover:border-liv-yellow hover:text-liv-yellow text-xs font-bold uppercase tracking-widest" data-testid={`sponsor-website-${s.id}`}>
                                                        <Globe className="w-3 h-3" /> Web Sitesi
                                                    </a>
                                                )}
                                                {igUrl && (
                                                    <a href={igUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 border border-liv-border hover:border-liv-yellow hover:text-liv-yellow text-xs font-bold uppercase tracking-widest" data-testid={`sponsor-instagram-${s.id}`}>
                                                        <Instagram className="w-3 h-3" /> Instagram
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                <section className="mt-20 bg-gradient-to-br from-liv-yellow to-yellow-500 text-black p-10 md:p-16 text-center">
                    <h3 className="font-display text-4xl md:text-6xl uppercase">SPONSOR OLUN, BİZE GÜÇ KATIN</h3>
                    <p className="mt-4 max-w-2xl mx-auto">Livanespor'un yükselişine ortak olun. Sponsorluk ve iş birliği fırsatları için bize ulaşın.</p>
                    <a href="/iletisim" className="inline-block mt-6 bg-black text-liv-yellow px-8 py-4 font-bold uppercase tracking-widest text-sm">İletişime Geç</a>
                </section>
            </div>
        </PublicLayout>
    );
};
export default Sponsors;
