import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Wand2, Save, Loader2, Download } from "lucide-react";
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

const AiPanel = () => {
    const [settings, setSettings] = useState(null);
    const [prompt, setPrompt] = useState("");
    const [aspect, setAspect] = useState("1:1");
    const [quality, setQuality] = useState("high");
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [apiKey, setApiKey] = useState("");
    const [keyEditing, setKeyEditing] = useState(false);

    useEffect(() => {
        adminApi.aiSettings().then(setSettings);
    }, []);

    const generate = async () => {
        if (!prompt.trim()) { toast.error("Lütfen bir prompt girin"); return; }
        setLoading(true);
        try {
            const res = await adminApi.generateImage({
                prompt, aspect_ratio: aspect, quality, save_to_media: true,
            });
            setHistory((h) => [{ ...res, prompt, when: Date.now() }, ...h].slice(0, 12));
            toast.success(`Görsel üretildi (${res.model})`);
        } catch (e) {
            toast.error("Üretim hatası: " + (e?.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    const saveKey = async () => {
        try {
            await adminApi.saveAiSettings({ openai_api_key: apiKey, enabled: true });
            toast.success("API anahtarı kaydedildi");
            setKeyEditing(false); setApiKey("");
            adminApi.aiSettings().then(setSettings);
        } catch (e) { toast.error("Kaydedilemedi"); }
    };

    return (
        <div className="space-y-8" data-testid="admin-ai-panel">
            <div>
                <div className="overline">İçerik Üretimi</div>
                <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><Wand2 className="w-8 h-8 text-liv-yellow" /> AI Görsel Üretimi</h1>
                <p className="text-sm text-neutral-400 mt-2">OpenAI gpt-image-2 modeli ile haber kapağı, hero görseli, akademi tanıtım veya sponsor duyuru görselleri üretin.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-liv-card border border-liv-border p-6 space-y-4">
                    <div>
                        <label className="liv-label">Prompt</label>
                        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="liv-input" placeholder="Örnek: Sarı-siyah taraftarlar dolu bir tribün, gece maçı, dramatik ışık, sinematik" data-testid="ai-prompt" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-neutral-500 uppercase tracking-widest">Hızlı Promptlar:</span>
                        {PROMPTS.map((p, i) => (
                            <button key={i} onClick={() => setPrompt(p)} className="text-xs px-2 py-1 border border-liv-border hover:border-liv-yellow text-neutral-300 hover:text-liv-yellow">{p.slice(0, 30)}...</button>
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

                <div className="bg-liv-card border border-liv-border p-6 space-y-4">
                    <h3 className="font-display text-2xl uppercase">AI Ayarları</h3>
                    <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest">Mevcut API Key</div>
                        <div className="font-mono text-sm mt-1">{settings?.openai_api_key_masked || "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-widest">Durum</div>
                        <div className="font-semibold mt-1 text-sm">{settings?.enabled !== false ? <span className="text-liv-yellow">Aktif</span> : <span className="text-red-400">Devre dışı</span>}</div>
                    </div>
                    {!keyEditing ? (
                        <button onClick={() => setKeyEditing(true)} className="btn-secondary !py-2 !px-4 !text-xs">API Anahtarını Değiştir</button>
                    ) : (
                        <div>
                            <label className="liv-label">Yeni OpenAI API Anahtarı</label>
                            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="liv-input" />
                            <div className="flex gap-2 mt-3">
                                <button onClick={saveKey} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2"><Save className="w-4 h-4" /> Kaydet</button>
                                <button onClick={() => { setKeyEditing(false); setApiKey(""); }} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {history.length > 0 && (
                <div className="bg-liv-card border border-liv-border p-6">
                    <h2 className="font-display text-3xl uppercase mb-4">Üretim Geçmişi</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {history.map((h, i) => (
                            <div key={i} className="bg-liv-surface border border-liv-border">
                                <img src={h.data_url} alt={h.prompt} className="w-full aspect-square object-cover" />
                                <div className="p-3">
                                    <div className="text-xs text-liv-yellow uppercase tracking-widest">{h.model}</div>
                                    <div className="text-xs text-neutral-300 mt-1 line-clamp-2">{h.prompt}</div>
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
