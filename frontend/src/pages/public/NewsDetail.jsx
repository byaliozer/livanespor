import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";

const NewsDetail = () => {
    const { slug } = useParams();
    const [post, setPost] = useState(null);
    const [related, setRelated] = useState([]);
    useEffect(() => {
        publicApi.post(slug).then(setPost).catch(() => setPost(false));
        publicApi.posts({ limit: 3 }).then(setRelated);
    }, [slug]);
    if (post === false) return <PublicLayout><div className="container-x section-pad"><h1 className="font-display text-5xl">Haber bulunamadı</h1></div></PublicLayout>;
    if (!post) return <PublicLayout><div className="container-x section-pad text-neutral-400">Yükleniyor…</div></PublicLayout>;
    return (
        <PublicLayout>
            <SEO title={post.seo_title || post.title} description={post.seo_description || post.excerpt} image={post.cover_image} />
            <article>
                <div className="relative h-[55vh] md:h-[75vh] bg-black overflow-hidden">
                    <img src={post.cover_image} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-70" />
                    <div className="absolute inset-0 hero-overlay" />
                    <div className="relative container-x h-full flex flex-col justify-end pb-12">
                        <Link to="/haberler" className="text-xs text-liv-yellow uppercase tracking-widest mb-3 hover:underline">← Haberler</Link>
                        <div className="overline">{post.category}</div>
                        <h1 className="font-display text-4xl md:text-7xl uppercase leading-tight max-w-4xl mt-2">{post.title}</h1>
                        <div className="mt-4 text-sm text-neutral-400">{post.author} · {new Date(post.published_at).toLocaleDateString("tr-TR", { dateStyle: "long" })}</div>
                    </div>
                </div>
                <div className="container-x py-12 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8">
                        <div className="prose-livanespor" dangerouslySetInnerHTML={{ __html: post.content }} />
                    </div>
                    <aside className="lg:col-span-4 space-y-4">
                        <div className="overline">İlgili Haberler</div>
                        {related.filter((r) => r.id !== post.id).slice(0, 3).map((r) => (
                            <Link key={r.id} to={`/haberler/${r.slug}`} className="block bg-liv-card border border-liv-border hover:border-liv-yellow p-4 group">
                                <div className="text-[10px] uppercase tracking-widest text-liv-yellow">{r.category}</div>
                                <div className="font-display text-lg mt-1 group-hover:text-liv-yellow">{r.title}</div>
                            </Link>
                        ))}
                    </aside>
                </div>
            </article>
        </PublicLayout>
    );
};
export default NewsDetail;
