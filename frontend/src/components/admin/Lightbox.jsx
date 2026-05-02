import { useEffect, useState } from "react";
import { X, Download, Copy, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Lightbox = ({ open, items, activeIndex, onClose, onIndex }) => {
    const [idx, setIdx] = useState(activeIndex || 0);
    useEffect(() => { setIdx(activeIndex || 0); }, [activeIndex, open]);
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
            if (e.key === "ArrowRight") setIdx((i) => Math.min((items?.length || 1) - 1, i + 1));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, items, onClose]);
    useEffect(() => { onIndex && onIndex(idx); /* eslint-disable-next-line */ }, [idx]);

    if (!open || !items || !items.length) return null;
    const cur = items[idx];
    if (!cur) return null;

    const download = async () => {
        try {
            const r = await fetch(cur.url, { mode: "cors" });
            const blob = await r.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = cur.filename || `${cur.template_key || "media"}.png`;
            document.body.appendChild(link); link.click(); link.remove();
            URL.revokeObjectURL(link.href);
        } catch { toast.error("İndirilemedi"); }
    };

    const copyCaption = async () => {
        const sc = cur.social_caption;
        if (!sc) return toast.error("Caption henüz hazır değil");
        try { await navigator.clipboard.writeText(sc.combined || sc.caption); toast.success("Caption + hashtag kopyalandı"); }
        catch { toast.error("Kopyalanamadı"); }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-6" onClick={onClose} data-testid="lightbox">
            <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute top-5 right-5 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Kapat" data-testid="lightbox-close">
                <X className="w-5 h-5" />
            </button>
            {items.length > 1 && idx > 0 && (
                <button onClick={(e) => { e.stopPropagation(); setIdx(idx - 1); }}
                    className="absolute left-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    data-testid="lightbox-prev"><ChevronLeft className="w-6 h-6" /></button>
            )}
            {items.length > 1 && idx < items.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); setIdx(idx + 1); }}
                    className="absolute right-5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    data-testid="lightbox-next"><ChevronRight className="w-6 h-6" /></button>
            )}
            <div className="flex flex-col lg:flex-row items-stretch gap-6 max-h-full max-w-7xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex-1 flex items-center justify-center">
                    <img src={cur.url} alt={cur.template_key || ""}
                        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
                        data-testid="lightbox-image" />
                </div>
                <div className="lg:w-96 flex flex-col gap-4 text-white max-h-[85vh] overflow-y-auto">
                    {cur.template_key && (
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Şablon</div>
                            <div className="font-display text-2xl uppercase">{cur.template_key.replace("_", " ")}</div>
                        </div>
                    )}
                    {cur.design && (
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-neutral-400">Design DNA</div>
                            <div className="text-sm">{cur.design.layout} · {cur.design.scene} · {cur.design.typography} · drama {cur.design.drama}</div>
                        </div>
                    )}
                    {cur.social_caption && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] uppercase tracking-widest text-liv-yellow">Instagram Caption</span>
                                <button onClick={copyCaption} className="text-[10px] uppercase tracking-widest text-liv-yellow hover:text-white inline-flex items-center gap-1" data-testid="lightbox-copy-caption"><Copy className="w-3 h-3" /> Kopyala</button>
                            </div>
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">{cur.social_caption.caption}</div>
                            <div className="text-xs text-liv-yellow/80 mt-3 break-words">{(cur.social_caption.hashtags || []).join(" ")}</div>
                        </div>
                    )}
                    {!cur.social_caption && cur.expecting_caption && (
                        <div className="bg-white/5 border border-white/10 p-4 rounded text-xs text-neutral-400 italic">
                            Caption GPT-5.2 ile arka planda hazırlanıyor… (~10-20sn)
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button onClick={download} data-testid="lightbox-download"
                            className="flex-1 px-4 py-2.5 bg-liv-yellow text-black font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90">
                            <Download className="w-4 h-4" /> İndir{items.length > 1 ? ` (${idx + 1}/${items.length})` : ""}
                        </button>
                    </div>
                    {items.length > 1 && (
                        <div className="flex gap-2 flex-wrap">
                            {items.map((it, i) => (
                                <button key={i} onClick={() => setIdx(i)}
                                    data-testid={`lightbox-thumb-${i}`}
                                    className={`w-12 h-12 overflow-hidden border-2 ${i === idx ? "border-liv-yellow" : "border-white/20 hover:border-white/50"}`}>
                                    <img src={it.url} alt="" className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                    <p className="text-[10px] text-white/40 mt-auto">ESC kapat · ← → varyasyon</p>
                </div>
            </div>
        </div>
    );
};
