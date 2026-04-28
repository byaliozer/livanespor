import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const AcademyNews = () => {
    const [posts, setPosts] = useState([]);
    useEffect(() => { publicApi.posts({ category: "akademi-haberleri" }).then(setPosts); }, []);
    return (
        <PublicLayout>
            <SEO title="Akademi Haberleri" description="Akademi duyuruları, başarı hikayeleri ve veli bilgilendirmeleri." />
            <div className="container-x section-pad">
                <div className="overline">Akademi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Haberler</h1>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((p) => (
                        <Link key={p.id} to={`/haberler/${p.slug}`} className="bg-liv-card border border-liv-border hover:border-liv-yellow group">
                            <div className="aspect-video overflow-hidden"><img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                            <div className="p-5">
                                <div className="text-xs uppercase tracking-widest text-liv-yellow">{new Date(p.published_at).toLocaleDateString("tr-TR")}</div>
                                <div className="font-display text-xl mt-1 group-hover:text-liv-yellow">{p.title}</div>
                                <p className="mt-2 text-sm text-neutral-400 line-clamp-2">{p.excerpt}</p>
                            </div>
                        </Link>
                    ))}
                    {posts.length === 0 && <div className="text-neutral-400 col-span-3">Henüz akademi haberi yok.</div>}
                </div>
            </div>
        </PublicLayout>
    );
};
export default AcademyNews;
