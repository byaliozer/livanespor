import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const News = () => {
    const [posts, setPosts] = useState([]);
    const [cats, setCats] = useState([]);
    const [cat, setCat] = useState("");
    useEffect(() => {
        publicApi.posts().then(setPosts);
        publicApi.categories().then(setCats);
    }, []);
    const filtered = cat ? posts.filter((p) => p.category === cat) : posts;
    return (
        <PublicLayout>
            <SEO title="Haberler · Livanespor" description="Livanespor son haberler, duyurular, maç önü/sonu ve transfer haberleri." />
            <div className="container-x section-pad">
                <div className="overline">Güncel</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Haberler</h1>
                <div className="mt-8 flex flex-wrap gap-2">
                    <button onClick={() => setCat("")} className={`px-4 py-2 text-xs uppercase tracking-wider border ${!cat ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`}>Tümü</button>
                    {cats.map((c) => (
                        <button key={c.id} onClick={() => setCat(c.slug)} className={`px-4 py-2 text-xs uppercase tracking-wider border ${cat === c.slug ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`} data-testid={`news-cat-${c.slug}`}>{c.name}</button>
                    ))}
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((p) => (
                        <Link key={p.id} to={`/haberler/${p.slug}`} className="bg-liv-card border border-liv-border hover:border-liv-yellow group transition-all" data-testid={`news-${p.id}`}>
                            <div className="aspect-video overflow-hidden"><img src={p.cover_image} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                            <div className="p-5">
                                <div className="text-xs uppercase tracking-widest text-liv-yellow">{p.category} · {new Date(p.published_at).toLocaleDateString("tr-TR")}</div>
                                <h3 className="font-display text-xl md:text-2xl mt-2 group-hover:text-liv-yellow uppercase">{p.title}</h3>
                                <p className="mt-2 text-sm text-neutral-400 line-clamp-2">{p.excerpt}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
};
export default News;
