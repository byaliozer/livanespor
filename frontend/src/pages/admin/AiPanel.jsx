import { useState } from "react";
import { adminApi } from "@/lib/api";
import { Wand2, Loader2, Download, Upload, X } from "lucide-react";
import { toast } from "sonner";

const ASPECTS = [
    { value: "1:1", label: "Kare 1:1" },
    { value: "16:9", label: "Yatay 16:9 (Hero/Kapak)" },
    { value: "4:5", label: "Dikey 4:5 (Sosyal)" },
    { value: "9:16", label: "Story 9:16" },
];

const PROMPTS = [
    "Premium bir futbol sahası gece maçı, sarı-siyah taraftarlar, dramatik ışık, yüksek kalite",
    "Genç çocuklar futbol antrenmanı, gün ışığı, takım ruhu, profesyonel akademi atmosferi",
    "Sarı-siyah forma giyen futbolcu portresi, stüdyo aydınlatma, Bursa stadyumu arka plan",
    "Modern futbol kulübü tesis girişi, sarı-siyah amblem, mimari fotoğraf",
];

// File → data URL (max 5MB)
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Dosya 5MB'tan büyük olamaz"));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
});

const RefSlot = ({ value, onChange, idx }) => {
    const pick = async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        try { onChange(await fileToDataUrl(f)); }
        catch (err) { toast.error(err.message); }
    };
    return (
        <div className="border border-liv-border bg-liv-surface p-2 min-w-[120px]" data-testid={`ai-ref-slot-${idx}`}>
            {value ? (
                <div className="relative">
                    <img src={value} alt={`Referans ${idx + 1}`} className="w-full h-24 object-contain bg-black" />
                    <button onClick={() => onChange(null)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 flex items-center justify-center" data-testid={`ai-ref-remove-${idx}`}><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <label className="cursor-pointer h-24 flex flex-col items-center justify-center border-2 border-dashed border-liv-border hover:border-liv-yellow gap-1">
                    <Upload className="w-4 h-4 text-neutral-500" />
                    <span className="text-[10px] uppercase tracking-widest text-neutral-500">Foto Ekle</span>
                    <input type="file" accept="image/*" onChange={pick} className="hidden" data-testid={`ai-ref-input-${idx}`} />
                </label>
            )}
        </div>
    );
};

const AiPanel = () => {
    const [prompt, setPrompt] = useState("");
    const [aspect, setAspect] = useState("1:1");
    const [quality, setQuality] = useState("high");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    // Up to 3 reference images (data URLs)
    const [refs, setRefs] = useState([null, null, null]);

    const setRefAt = (i, v) => setRefs((arr) => {
        const next = [...arr];
        next[i] = v;
        return next;
    });

    const generate = async () => {
        if (!prompt.trim()) { toast.error("Lütfen bir prompt girin"); return; }
        setLoading(true);
        try {
            const reference_images = refs.filter(Boolean);
            const res = await adminApi.generateImage({
                prompt, aspect_ratio: aspect, quality, save_to_media: true,
                reference_images: reference_images.length ? reference_images : undefined,
            });
            setHistory((h) => [{ ...res, prompt, when: Date.now(), refs: reference_images }, ...h].slice(0, 12));
            toast.success(`Görsel üretildi (DR AI Image 2)`);
        } catch (e) {
            toast.error("Üretim hatası: " + (e?.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    return (
        <div className="space-y-8" data-testid="admin-ai-panel">
            <div>
                <div className="overline">İçerik Üretimi</div>
                <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><Wand2 className="w-8 h-8 text-liv-yellow" /> AI Görsel</h1>
                <p className="text-sm text-neutral-400 mt-2">DR AI Image 2 — Her görsel 1 kredi harcar. Referans fotoğraf eklerseniz (opsiyonel), AI bunları görsel üretirken kaynak olarak kullanır.</p>
            </div>

            <div className="bg-liv-card border border-liv-border p-6 space-y-4">
                <div>
                    <label className="liv-label">Prompt</label>
                    <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="liv-input" placeholder="Örnek: Sarı-siyah taraftarlar dolu bir tribün, gece maçı, dramatik ışık, sinematik" data-testid="ai-prompt" />
                </div>

                <div>
                    <label className="liv-label">Referans Fotoğraflar (opsiyonel, en fazla 3)</label>
                    <div className="grid grid-cols-3 gap-3" data-testid="ai-ref-grid">
                        {refs.map((v, i) => <RefSlot key={i} value={v} onChange={(nv) => setRefAt(i, nv)} idx={i} />)}
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1.5">İpucu: Bir oyuncu portresi, stadyum fotoğrafı veya forma örneği yükleyerek AI'a stil/karakter referansı verebilirsiniz.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-neutral-500 uppercase tracking-widest">Hızlı Promptlar:</span>
                    {PROMPTS.map((p, i) => (
                        <button key={i} onClick={() => setPrompt(p)} className="text-xs px-2 py-1 border border-liv-border hover:border-liv-yellow text-neutral-300 hover:text-liv-yellow" data-testid={`ai-quick-${i}`}>{p.slice(0, 30)}...</button>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="liv-label">En Boy Oranı</label>
                        <select value={aspect} onChange={(e) => setAspect(e.target.value)} className="liv-input" data-testid="ai-aspect">
                            {ASPECTS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="liv-label">Kalite</label>
                        <select value={quality} onChange={(e) => setQuality(e.target.value)} className="liv-input" data-testid="ai-quality">
                            <option value="high">Yüksek</option>
                            <option value="medium">Orta</option>
                            <option value="low">Düşük (hızlı)</option>
                        </select>
                    </div>
                </div>
                <button disabled={loading} onClick={generate} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="ai-generate-btn">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor (1-60sn)...</> : <><Wand2 className="w-4 h-4" /> Görsel Üret</>}
                </button>
            </div>

            {history.length > 0 && (
                <div className="bg-liv-card border border-liv-border p-6" data-testid="ai-history">
                    <h2 className="font-display text-3xl uppercase mb-4">Üretim Geçmişi</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {history.map((h, i) => (
                            <div key={i} className="bg-liv-surface border border-liv-border">
                                <img src={h.data_url} alt={h.prompt} className="w-full aspect-square object-cover" />
                                <div className="p-3">
                                    <div className="text-xs text-liv-yellow uppercase tracking-widest">DR AI Image 2</div>
                                    <div className="text-xs text-neutral-300 mt-1 line-clamp-2">{h.prompt}</div>
                                    {h.refs?.length > 0 && <div className="text-[10px] text-neutral-500 mt-1">{h.refs.length} referans foto kullanıldı</div>}
                                    <a href={h.data_url} download={`liv-${i}.png`} className="text-xs text-liv-yellow hover:underline inline-flex items-center gap-1 mt-2"><Download className="w-3 h-3" /> İndir</a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiPanel;
