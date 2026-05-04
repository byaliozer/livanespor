import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Brain, Loader2, RefreshCw, Sparkles, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";

// Lightweight markdown renderer (only what we need: ## headings, - bullets, **bold**)
const renderMarkdown = (text) => {
    if (!text) return null;
    const blocks = text.split(/\n\n+/);
    return blocks.map((b, i) => {
        const lines = b.split("\n");
        const first = lines[0] || "";
        if (/^##\s/.test(first)) {
            return <h2 key={i} className="font-display text-2xl uppercase mt-4 mb-2 text-liv-yellow">{first.replace(/^##\s/, "")}</h2>;
        }
        if (/^###\s/.test(first)) {
            return <h3 key={i} className="font-display text-lg uppercase mt-3 mb-1 text-neutral-200">{first.replace(/^###\s/, "")}</h3>;
        }
        if (lines.every((l) => /^\s*[-*]\s/.test(l))) {
            return (
                <ul key={i} className="list-disc pl-6 space-y-1 text-sm text-neutral-300">
                    {lines.map((l, j) => <li key={j} dangerouslySetInnerHTML={{ __html: boldify(l.replace(/^\s*[-*]\s/, "")) }} />)}
                </ul>
            );
        }
        return <p key={i} className="text-sm text-neutral-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(b) }} />;
    });
};
const boldify = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong class="text-neutral-100">$1</strong>');

const MatchAnalysis = () => {
    const [matches, setMatches] = useState([]);
    const [activeId, setActiveId] = useState("");
    const [report, setReport] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [credits, setCredits] = useState(null);

    useEffect(() => {
        Promise.all([
            api.get("/admin/matches").then((r) => r.data),
            api.get("/admin/subscription").then((r) => r.data).catch(() => null),
        ]).then(([m, sub]) => {
            const upcoming = (m || []).filter((x) => x.status === "upcoming").sort((a, b) => (a.match_date || "").localeCompare(b.match_date || ""));
            setMatches(upcoming);
            if (upcoming[0]) setActiveId(upcoming[0].id);
            setCredits(sub?.credit_balance);
            setLoading(false);
        });
    }, []);

    const fetchReport = async (id) => {
        if (!id) return;
        const r = await api.get(`/admin/match-analysis/${id}`);
        setReport(r.data && r.data.id ? r.data : null);
    };
    useEffect(() => { fetchReport(activeId); }, [activeId]);

    const generate = async () => {
        if (!activeId) return;
        if (!confirm("Bu maç için 1 kredi harcanarak AI analiz raporu oluşturulacak. Onaylıyor musunuz?")) return;
        setGenerating(true);
        try {
            const r = await api.post("/admin/match-analysis/generate", { match_id: activeId });
            setReport(r.data);
            const sub = await api.get("/admin/subscription");
            setCredits(sub.data.credit_balance);
            toast.success("Rapor oluşturuldu");
        } catch (e) {
            toast.error("Hata: " + (e?.response?.data?.detail || e.message));
        } finally { setGenerating(false); }
    };

    const regenerate = async () => {
        if (!confirm("Mevcut analiz silinecek ve yeniden 1 kredi harcanacak. Devam edilsin mi?")) return;
        await api.delete(`/admin/match-analysis/${activeId}`);
        setReport(null);
        await generate();
    };

    if (loading) return <div className="text-neutral-400">Yükleniyor…</div>;

    const activeMatch = matches.find((m) => m.id === activeId);

    return (
        <div className="space-y-6" data-testid="admin-match-analysis">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Saha Operasyonu</div>
                    <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><Brain className="w-8 h-8 text-liv-yellow" /> Maç Önü Analizi</h1>
                    <p className="text-xs text-neutral-500 mt-1">DR AI FUTBOL · Rakibinizin form ve veri analizini, kendi son durumunuzla birleştirip BAŞKAN ve teknik ekibe profesyonel rapor üretir. <strong>Her rapor 1 kredi.</strong></p>
                </div>
                {credits != null && <div className="text-xs text-neutral-400">Kredi bakiyesi: <span className="text-liv-yellow font-bold text-2xl font-display">{credits}</span></div>}
            </div>

            {matches.length === 0 ? (
                <div className="bg-liv-card border border-liv-border p-8 text-center">
                    <Brain className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
                    <p className="text-neutral-300">Yaklaşan maç bulunmuyor.</p>
                </div>
            ) : (
                <>
                    <div className="bg-liv-card border border-liv-border p-5 rounded-md">
                        <label className="liv-label">Maç seç (yaklaşan)</label>
                        <select className="liv-input" value={activeId} onChange={(e) => setActiveId(e.target.value)} data-testid="match-analysis-select">
                            {matches.map((m) => <option key={m.id} value={m.id}>{(m.match_date || "").slice(0, 10)} · {m.home_team} vs {m.away_team}</option>)}
                        </select>
                        {activeMatch && (
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-neutral-400">
                                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {(activeMatch.match_date || "").slice(0, 10)}</span>
                                {activeMatch.venue && <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeMatch.venue}</span>}
                                {activeMatch.competition && <span>{activeMatch.competition}</span>}
                            </div>
                        )}
                    </div>

                    {!report && (
                        <div className="bg-liv-card border border-liv-border p-8 rounded-md text-center" data-testid="match-analysis-empty">
                            <Sparkles className="w-12 h-12 text-liv-yellow mx-auto mb-3" />
                            <p className="text-neutral-300 mb-4">Bu maç için henüz analiz oluşturulmamış.</p>
                            <button onClick={generate} disabled={generating || (credits != null && credits < 1)} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50" data-testid="match-analysis-generate-btn">
                                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> AI Çalışıyor (~10-30sn)…</> : <><Brain className="w-4 h-4" /> Analizi Oluştur (1 kredi)</>}
                            </button>
                            {credits != null && credits < 1 && <p className="text-xs text-amber-400 mt-2">Yetersiz kredi.</p>}
                        </div>
                    )}

                    {report && (
                        <div className="bg-liv-card border border-liv-border p-6 md:p-8 rounded-md" data-testid="match-analysis-report">
                            <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-4 border-b border-liv-border">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-liv-yellow">DR AI FUTBOL · Maç Önü Analiz Raporu</div>
                                    <div className="font-display text-3xl mt-1">vs {report.opponent_name}</div>
                                    <div className="text-xs text-neutral-500 mt-1">Oluşturuldu: {new Date(report.generated_at).toLocaleString("tr-TR")} · {report.we_are_home ? "Ev sahibiyiz" : "Deplasmandayız"}</div>
                                </div>
                                <button onClick={regenerate} className="btn-ghost-light !py-2 !px-3 !text-xs inline-flex items-center gap-1" data-testid="match-analysis-regenerate"><RefreshCw className="w-3.5 h-3.5" /> Yeniden Oluştur (1 kredi)</button>
                            </div>
                            <div className="prose prose-invert max-w-none">
                                {renderMarkdown(report.content_markdown)}
                            </div>
                            {(report.our_form?.length || report.h2h_summary?.length) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-liv-border">
                                    {report.our_form?.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Bizim Son 5 Maç (kaynak veri)</div>
                                            <ul className="text-xs text-neutral-400 space-y-0.5">
                                                {report.our_form.map((f, i) => <li key={i}>· {f}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {report.h2h_summary?.length > 0 && (
                                        <div>
                                            <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Geçmiş Karşılaşmalar (kaynak veri)</div>
                                            <ul className="text-xs text-neutral-400 space-y-0.5">
                                                {report.h2h_summary.map((f, i) => <li key={i}>· {f}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
export default MatchAnalysis;
