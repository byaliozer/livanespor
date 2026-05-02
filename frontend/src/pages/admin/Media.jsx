import { useEffect, useState } from "react";
import { adminApi, API } from "@/lib/api";
import { Trash2, Upload, Download, Filter, Image as ImageIcon, Wand2 } from "lucide-react";
import { toast } from "sonner";

const SOURCE_LABEL = {
    upload: "Yükleme",
    ai: "AI (Prompt)",
    ai_template: "AI (Şablon)",
};

const assetUrl = (m) => {
    if (m.public_url) return `${API.replace(/\/api$/, "")}${m.public_url}`;
    return m.data_url || "";
};

const Media = () => {
    const [list, setList] = useState([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const data = await adminApi.mediaArchive(filter || undefined, 500);
            setList(data);
        } catch (e) { toast.error("Arşiv yüklenemedi"); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

    const handleFile = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error("Dosya 5 MB üzeri olamaz"); return; }
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await adminApi.uploadMedia({ title: file.name, data_url: reader.result });
                toast.success("Yüklendi"); load();
            } catch (err) { toast.error("Yüklenemedi"); }
        };
        reader.readAsDataURL(file);
    };

    const remove = async (m) => {
        if (!window.confirm("Silinsin mi? (Soft-delete; arşivden kaldırılır)")) return;
        try {
            await adminApi.mediaSoftDelete(m.id);
            toast.success("Silindi"); load();
        } catch (_) { toast.error("Silinemedi"); }
    };

    const counts = list.reduce((acc, m) => { const k = m.source || "upload"; acc[k] = (acc[k] || 0) + 1; return acc; }, {});

    return (
        <div className="space-y-6" data-testid="admin-media">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Medya Arşivi</div>
                    <h1 className="font-display text-5xl uppercase mt-1">Arşiv ({list.length}<span className="text-neutral-500 text-2xl"> / 500</span>)</h1>
                    <p className="text-sm text-neutral-400 mt-2">Object Storage'da saklanan tüm medya. En eski öğeler 500 limitini aşınca otomatik arşivlenir.</p>
                </div>
                <label className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2 cursor-pointer" data-testid="media-upload-label">
                    <Upload className="w-4 h-4" /> Görsel Yükle
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="media-upload-input" />
                </label>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 items-center" data-testid="media-filters">
                <span className="text-xs text-neutral-500 uppercase tracking-widest inline-flex items-center gap-1"><Filter className="w-3 h-3" /> Filtre:</span>
                {[
                    { v: "", label: "Tümü", icon: ImageIcon },
                    { v: "upload", label: "Yüklemeler", icon: Upload },
                    { v: "ai", label: "AI Prompt", icon: Wand2 },
                    { v: "ai_template", label: "AI Şablon", icon: Wand2 },
                ].map(({ v, label, icon: Icon }) => (
                    <button
                        key={v}
                        onClick={() => setFilter(v)}
                        data-testid={`filter-${v || "all"}`}
                        className={`text-xs px-3 py-1 border inline-flex items-center gap-1 ${filter === v ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border text-neutral-300 hover:border-liv-yellow"}`}
                    >
                        <Icon className="w-3 h-3" /> {label} {v && counts[v] ? `(${counts[v]})` : ""}
                    </button>
                ))}
            </div>

            {loading && <div className="text-neutral-400">Yükleniyor…</div>}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {list.map((m) => {
                    const src = assetUrl(m);
                    return (
                        <div key={m.id} className="bg-liv-card border border-liv-border group relative" data-testid={`media-item-${m.id}`}>
                            <div className="aspect-square overflow-hidden bg-black">
                                {src ? <img src={src} alt={m.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-neutral-600"><ImageIcon className="w-6 h-6" /></div>}
                            </div>
                            <div className="p-2">
                                <div className="text-xs truncate">{m.title}</div>
                                <div className="text-[10px] text-neutral-500 uppercase flex items-center gap-1">
                                    <span className={`px-1 ${m.source === "ai_template" ? "text-liv-yellow" : m.source === "ai" ? "text-blue-400" : "text-neutral-400"}`}>{SOURCE_LABEL[m.source] || m.source || "upload"}</span>
                                    {m.template_key && <span>· {m.template_key}</span>}
                                </div>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {src && <a href={src} download={`media-${m.id}.png`} target="_blank" rel="noreferrer" className="w-7 h-7 bg-liv-yellow text-black flex items-center justify-center"><Download className="w-3 h-3" /></a>}
                                <button onClick={() => remove(m)} data-testid={`media-delete-${m.id}`} className="w-7 h-7 bg-red-600 text-white flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    );
                })}
                {!loading && list.length === 0 && <div className="col-span-2 md:col-span-4 lg:col-span-6 text-center text-neutral-500 py-12">Henüz medya yok.</div>}
            </div>
        </div>
    );
};
export default Media;
