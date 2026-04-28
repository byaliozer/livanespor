import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/hooks/useReveal";
import { publicApi } from "@/lib/api";
import { Trophy, Users, ShieldCheck, Heart, ArrowRight } from "lucide-react";

const Academy = () => {
    const [data, setData] = useState({ groups: [], staff: [], posts: [], sponsors: [] });
    useEffect(() => {
        Promise.all([
            publicApi.academyGroups(),
            publicApi.staff({ category: "academy" }),
            publicApi.posts({ category: "akademi-haberleri" }),
            publicApi.sponsors({ scope: "academy" }),
        ]).then(([groups, staff, posts, sponsors]) => setData({ groups, staff, posts, sponsors }));
    }, []);

    return (
        <PublicLayout>
            <SEO title="Akademi · Livanespor" description="Livanespor Futbol Akademi: U8'den U17'ye uzman antrenörler, profesyonel altyapı." />

            {/* Hero */}
            <section className="relative h-[80vh] bg-black overflow-hidden">
                <img src="https://images.pexels.com/photos/26283685/pexels-photo-26283685.jpeg" alt="Akademi" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
                <div className="relative container-x h-full flex flex-col justify-end pb-16">
                    <div className="overline mb-3">Livanespor</div>
                    <h1 className="font-display text-6xl sm:text-8xl lg:text-[10rem] leading-[0.85] uppercase">FUTBOL<br/>AKADEMİ</h1>
                    <p className="mt-6 max-w-2xl text-lg text-neutral-200">Gelişim · Disiplin · Karakter · Takım Ruhu</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to="/akademi/basvuru" className="btn-primary" data-testid="academy-cta-apply">Başvuru Yap</Link>
                        <Link to="/akademi/antrenman-takvimi" className="btn-secondary">Antrenman Takvimi</Link>
                        <Link to="/akademi/teknik-kadro" className="btn-ghost-light">Teknik Kadro</Link>
                    </div>
                </div>
            </section>

            {/* Avantajlar */}
            <section className="container-x section-pad">
                <Reveal>
                    <div className="text-center mb-12">
                        <div className="overline">Neden Livanespor Akademi?</div>
                        <h2 className="font-display text-5xl md:text-7xl uppercase mt-2">Avantajlarımız</h2>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { icon: Users, title: "Yaşa Uygun Eğitim", text: "U8'den U17'ye yaş gruplarına özel program." },
                        { icon: Trophy, title: "Uzman Antrenörler", text: "Lisanslı, deneyimli antrenör kadrosu." },
                        { icon: ShieldCheck, title: "Disiplin & Karakter", text: "Sahada da hayatta da gelişim." },
                        { icon: Heart, title: "Takım Ruhu", text: "Futbol kültürü ve dostluk." },
                    ].map(({ icon: Icon, title, text }, i) => (
                        <Reveal key={i} delay={i * 80}>
                            <div className="bg-liv-card border border-liv-border p-6 h-full liv-card-glow transition-all">
                                <Icon className="w-8 h-8 text-liv-yellow" />
                                <div className="font-display text-2xl uppercase mt-4">{title}</div>
                                <p className="text-sm text-neutral-400 mt-2">{text}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* Yaş Grupları */}
            <section className="container-x section-pad pt-0">
                <Reveal>
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                        <div>
                            <div className="overline">Kategoriler</div>
                            <h2 className="font-display text-5xl md:text-7xl uppercase">Yaş Grupları</h2>
                        </div>
                        <Link to="/akademi/yas-gruplari" className="text-liv-yellow font-bold uppercase tracking-wider text-sm hover:underline">Tümü →</Link>
                    </div>
                </Reveal>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {data.groups.map((g, i) => (
                        <Reveal key={g.id} delay={i * 60}>
                            <Link to="/akademi/basvuru" className="block bg-liv-yellow text-black p-6 hover:bg-yellow-300 transition-all relative overflow-hidden group" data-testid={`academy-group-${g.name}`}>
                                <div className="font-display text-6xl md:text-7xl uppercase">{g.name}</div>
                                <div className="text-xs font-bold uppercase tracking-widest mt-2">{g.age_range}</div>
                                <div className="text-xs mt-3 line-clamp-2">{g.description}</div>
                                <ArrowRight className="absolute bottom-4 right-4 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* CTA strip */}
            <section className="bg-gradient-to-br from-liv-yellow to-yellow-500 text-black">
                <div className="container-x py-16 md:py-24 grid grid-cols-1 md:grid-cols-2 items-center gap-8">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.3em]">Akademi Kayıtları Açık</div>
                        <h2 className="font-display text-5xl md:text-7xl uppercase mt-2 leading-none">GELECEK SENİNLE BAŞLAR</h2>
                    </div>
                    <div className="flex md:justify-end gap-3">
                        <Link to="/akademi/basvuru" className="bg-black text-liv-yellow px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-neutral-900">Hemen Başvur</Link>
                        <Link to="/akademi/antrenman-takvimi" className="bg-transparent border-2 border-black text-black px-8 py-4 font-bold uppercase tracking-widest text-sm hover:bg-black hover:text-liv-yellow">Antrenmanlar</Link>
                    </div>
                </div>
            </section>

            {/* Teknik kadro */}
            {data.staff.length > 0 && (
                <section className="container-x section-pad">
                    <Reveal>
                        <div className="overline">Akademi</div>
                        <h2 className="font-display text-5xl md:text-7xl uppercase mt-2 mb-8">Teknik Kadro</h2>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.staff.map((s) => (
                            <div key={s.id} className="bg-liv-card border border-liv-border">
                                <div className="aspect-[4/3] overflow-hidden"><img src={s.photo_url} alt={s.name} className="w-full h-full object-cover" /></div>
                                <div className="p-5">
                                    <div className="text-xs uppercase text-liv-yellow tracking-widest">{s.role_title}</div>
                                    <div className="font-display text-2xl mt-1">{s.name}</div>
                                    <p className="mt-2 text-sm text-neutral-400">{s.bio}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Akademi sponsors */}
            {data.sponsors.length > 0 && (
                <section className="container-x section-pad pt-0">
                    <Reveal>
                        <div className="overline">Akademi Sponsorları</div>
                        <h2 className="font-display text-5xl uppercase mt-2 mb-8">Bize Güç Katanlar</h2>
                    </Reveal>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.sponsors.map((s) => (
                            <a key={s.id} href={s.website || "#"} target="_blank" rel="noreferrer" className="bg-liv-card border border-liv-border hover:border-liv-yellow p-8 aspect-[16/9] flex items-center justify-center text-center transition-all">
                                {s.logo_url ? <img src={s.logo_url} alt={s.name} className="max-h-full" /> : <div className="font-display text-xl">{s.name}</div>}
                            </a>
                        ))}
                    </div>
                </section>
            )}

            {/* Akademi haberleri */}
            {data.posts.length > 0 && (
                <section className="container-x section-pad pt-0">
                    <Reveal>
                        <div className="flex items-end justify-between mb-8">
                            <h2 className="font-display text-5xl uppercase">Akademi Haberleri</h2>
                            <Link to="/akademi/haberler" className="text-liv-yellow text-sm font-bold uppercase">Tümü →</Link>
                        </div>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.posts.slice(0, 3).map((p) => (
                            <Link key={p.id} to={`/haberler/${p.slug}`} className="bg-liv-card border border-liv-border hover:border-liv-yellow group">
                                <div className="aspect-video overflow-hidden"><img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                                <div className="p-5">
                                    <div className="text-xs text-liv-yellow uppercase">{new Date(p.published_at).toLocaleDateString("tr-TR")}</div>
                                    <div className="font-display text-xl mt-1 group-hover:text-liv-yellow">{p.title}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </PublicLayout>
    );
};
export default Academy;
