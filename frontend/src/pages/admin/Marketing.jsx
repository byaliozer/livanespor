import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Sparkles, Download, Copy, Loader2, Trash2, RefreshCw, Megaphone, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";

const SIZE_LABEL = {
    feed: { label: "Instagram Feed", dim: "1080×1080", icon: "▢" },
    story: { label: "Story / Reel", dim: "1080×1920", icon: "▯" },
    landscape: { label: "Reklam (Landscape)", dim: "1200×628", icon: "▭" },
};

const CATEGORY_LABEL = {
    awareness: "Farkındalık",
    feature: "Özellik",
    urgency: "Aciliyet",
    "social-proof": "Sosyal Kanıt",
    cta: "CTA",
};

const Marketing = () => {
    const [concepts, setConcepts] = useState([]);
    const [assets, setAssets] = useState([]);
    const [credits, setCredits] = useState(null);
    const [generating, setGenerating] = useState(null); // concept_id while generating
    const [lightbox, setLightbox] = useState(null); // {url, label}
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        const [c, a, sub] = await Promise.all([
            api.get("/admin/marketing/concepts").then((r) => r.data),
            api.get("/admin/marketing").then((r) => r.data),
            api.get("/admin/subscription").then((r) => r.data).catch(() => ({})),
        ]);
        setConcepts(c || []);
        setAssets(a || []);
        setCredits(sub?.credit_balance);
        setLoading(false);
    };

    useEffect(() => { refresh(); }, []);

    const assetForConcept = (cid) => assets.find((a) => a.concept_id === cid);

    const generate = async (conceptId) => {
        if (!confirm("Bu konsept için 3 boyutta görsel + caption üretilecek. Toplam 3 kredi harcanacak. Onaylıyor musunuz?")) return;
        setGenerating(conceptId);
        try {
            const r = await api.post("/admin/marketing/generate", { concept_id: conceptId });
            const assetId = r.data.id;
            toast.success("Üretim başladı (~60-90sn). İlerleme otomatik gösterilir…");
            // Optimistic add to list
            setAssets((prev) => [r.data, ...prev.filter((a) => a.concept_id !== conceptId)]);
            // Poll every 5s until status changes
            const start = Date.now();
            const poll = async () => {
                try {
                    const pr = await api.get(`/admin/marketing/${assetId}`);
                    setAssets((prev) => prev.map((a) => a.id === assetId ? pr.data : a));
                    const st = pr.data.status;
                    if (st === "completed") {
                        toast.success(`${pr.data.concept_title}: ${Object.keys(pr.data.images || {}).length} görsel hazır!`);
                        await refresh();
                        setGenerating(null);
                        return;
                    }
                    if (st === "failed") {
                        toast.error("Üretim başarısız: " + (pr.data.error || "bilinmeyen hata"));
                        await refresh();
                        setGenerating(null);
                        return;
                    }
                    if (Date.now() - start > 4 * 60 * 1000) {
                        toast.error("Üretim zaman aşımı (4dk). Sayfayı yenileyin.");
                        setGenerating(null);
                        return;
                    }
                    setTimeout(poll, 5000);
                } catch (e) {
                    setGenerating(null);
                    toast.error("Polling hatası: " + e.message);
                }
            };
            setTimeout(poll, 5000);
        } catch (e) {
            toast.error("Hata: " + (e?.response?.data?.detail || e.message));
            setGenerating(null);
        }
    };

    const regenerateCaption = async (id) => {
        try {
            const r = await api.post(`/admin/marketing/${id}/regenerate-caption`);
            toast.success("Yeni caption üretildi");
            setAssets((prev) => prev.map((a) => a.id === id ? { ...a, caption: r.data.caption } : a));
        } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
    };

    const remove = async (id) => {
        if (!confirm("Bu pazarlama materyali tüm görselleriyle silinsin mi?")) return;
        await api.delete(`/admin/marketing/${id}`);
        toast.success("Silindi");
        refresh();
    };

    const copyCaption = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Caption panoya kopyalandı — Instagram'a yapıştırın!");
    };

    const downloadImage = async (url, filename) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
            toast.success(`İndirildi: ${filename}`);
        } catch (e) { toast.error("İndirme hatası: " + e.message); }
    };

    if (loading) return <div className="text-neutral-400">Yükleniyor…</div>;

    const totalGenerated = assets.length;
    const totalImages = assets.reduce((acc, a) => acc + Object.keys(a.images || {}).length, 0);

    return (
        <div className="space-y-6" data-testid="admin-marketing">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Pazarlama</div>
                    <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3">
                        <Megaphone className="w-8 h-8 text-liv-yellow" /> Pazarlama Görselleri
                    </h1>
                    <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
                        DR AI FUTBOL'un kendi pazarlama içerikleri. 10 farklı konsept × 3 Instagram boyutu (Feed · Story · Reklam) +
                        DR AI Engine ile otomatik üretilen Türkçe caption + hashtag. Her konsept <strong>3 kredi</strong>.
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs text-neutral-400">Kredi bakiyesi</div>
                    <div className="font-display text-3xl text-liv-yellow" data-testid="marketing-credits">{credits ?? "—"}</div>
                    <div className="text-[10px] text-neutral-500 mt-1">{totalGenerated} konsept · {totalImages} görsel üretildi</div>
                </div>
            </div>

            {/* Concepts grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {concepts.map((c) => {
                    const asset = assetForConcept(c.id);
                    const isGen = generating === c.id;
                    return (
                        <div key={c.id} className={`bg-liv-card border ${asset ? "border-liv-yellow/40" : "border-liv-border"} rounded-md overflow-hidden`} data-testid={`marketing-concept-${c.id}`}>
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="inline-block text-[10px] uppercase tracking-widest text-liv-yellow border border-liv-yellow/30 px-2 py-0.5 mb-2">{CATEGORY_LABEL[c.category] || c.category}</span>
                                        <h3 className="font-display text-xl uppercase leading-tight" data-testid={`concept-title-${c.id}`}>{c.title}</h3>
                                        <p className="text-xs text-neutral-400 mt-2 italic">"{c.hook}"</p>
                                    </div>
                                    {!asset && (
                                        <button
                                            onClick={() => generate(c.id)}
                                            disabled={isGen || (credits != null && credits < 3)}
                                            className="btn-primary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                                            data-testid={`generate-${c.id}`}
                                        >
                                            {isGen ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Üretiliyor…</> : <><Sparkles className="w-3.5 h-3.5" /> Üret (3 kredi)</>}
                                        </button>
                                    )}
                                </div>

                                {asset && (
                                    <div className="mt-4 space-y-3">
                                        {asset.status === "pending" && (
                                            <div className="bg-amber-500/10 border border-amber-500/40 p-2.5 rounded inline-flex items-center gap-2 text-xs text-amber-200">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Üretiliyor… {Object.keys(asset.images || {}).length}/{(asset.sizes_requested || []).length} görsel hazır
                                            </div>
                                        )}
                                        {asset.status === "failed" && (
                                            <div className="bg-red-500/10 border border-red-500/40 p-2.5 rounded text-xs text-red-300">
                                                ⚠️ Üretim başarısız oldu (krediler iade edildi). {asset.error}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-2">
                                            {(asset.sizes_requested || Object.keys(asset.images)).map((size) => {
                                                const img = asset.images?.[size];
                                                if (!img) {
                                                    return (
                                                        <div key={size} className="aspect-square bg-liv-black border border-liv-border flex flex-col items-center justify-center text-neutral-600">
                                                            <Loader2 className="w-5 h-5 animate-spin mb-1" />
                                                            <div className="text-[9px] uppercase">{SIZE_LABEL[size].label}</div>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={size}
                                                        onClick={() => setLightbox({ url: img.public_url, label: `${asset.concept_title} — ${SIZE_LABEL[size].label}`, filename: `dr-ai-futbol-${c.id}-${size}.png` })}
                                                        className="group relative aspect-square bg-liv-black border border-liv-border overflow-hidden hover:border-liv-yellow transition"
                                                        data-testid={`thumb-${c.id}-${size}`}
                                                    >
                                                        <img src={img.public_url} alt={size} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                                                            <div className="text-[9px] uppercase tracking-widest text-liv-yellow">{SIZE_LABEL[size].label}</div>
                                                            <div className="text-[9px] text-neutral-400">{SIZE_LABEL[size].dim}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {Object.keys(asset.images || {}).length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(asset.images).map(([size, img]) => (
                                                    <button
                                                        key={size}
                                                        onClick={() => downloadImage(img.public_url, `dr-ai-futbol-${c.id}-${size}.png`)}
                                                        className="text-[10px] uppercase tracking-wider bg-liv-surface border border-liv-border hover:border-liv-yellow hover:text-liv-yellow px-2 py-1 inline-flex items-center gap-1"
                                                        data-testid={`download-${c.id}-${size}`}
                                                    >
                                                        <Download className="w-3 h-3" /> {size}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {asset.caption && (
                                            <div className="bg-liv-surface/60 border border-liv-border p-3 rounded">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="text-[10px] uppercase tracking-widest text-neutral-500">Instagram Caption</div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => regenerateCaption(asset.id)} title="Caption'ı yenile (ücretsiz)" className="text-neutral-500 hover:text-liv-yellow" data-testid={`regen-cap-${c.id}`}>
                                                            <RefreshCw className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => copyCaption(asset.caption)} title="Caption'ı kopyala" className="text-neutral-500 hover:text-liv-yellow" data-testid={`copy-cap-${c.id}`}>
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => remove(asset.id)} title="Sil" className="text-neutral-500 hover:text-red-400" data-testid={`delete-${c.id}`}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">{asset.caption}</p>
                                            </div>
                                        )}

                                        <div className="text-[10px] text-neutral-600 flex justify-between">
                                            <span>📅 {new Date(asset.generated_at).toLocaleString("tr-TR")}</span>
                                            <span>🎯 {asset.cta_url}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {credits != null && credits < 3 && (
                <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded inline-flex items-center gap-3">
                    <ImageIcon className="w-5 h-5 text-amber-400" />
                    <div className="text-xs">
                        Kredi yetersiz — yeni konsept üretmek için en az 3 kredi gerekli. <a href="/admin/paketim" className="text-liv-yellow underline">PAKETİM ekranından yükseltin</a>.
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setLightbox(null); }}>
                    <div className="relative max-w-5xl max-h-[92vh]">
                        <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-neutral-400 hover:text-white"><X className="w-6 h-6" /></button>
                        <img src={lightbox.url} alt={lightbox.label} className="max-w-full max-h-[85vh] object-contain" />
                        <div className="mt-3 flex items-center justify-between text-xs text-neutral-300">
                            <span>{lightbox.label}</span>
                            <button onClick={() => downloadImage(lightbox.url, lightbox.filename)} className="btn-primary !py-1.5 !px-3 !text-xs inline-flex items-center gap-1.5">
                                <Download className="w-3.5 h-3.5" /> İndir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketing;
