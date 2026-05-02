import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi, API, getToken } from "@/lib/api";
import { Wand2, Loader2, Download, RefreshCw, Image as ImageIcon, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

// Map URL helper — public media proxy returns bytes; we also send auth for consistency
const mediaUrl = (m) => {
    if (m?.public_url) {
        // public endpoint is open, but dev cache-buster
        return `${API.replace(/\/api$/, "")}${m.public_url}`;
    }
    return m?.data_url || "";
};

const JobStatusIcon = ({ status }) => {
    if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === "processing") return <Loader2 className="w-4 h-4 animate-spin text-liv-yellow" />;
    return <Clock className="w-4 h-4 text-neutral-400" />;
};

const AiStudio = () => {
    const [templates, setTemplates] = useState([]);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [activeKey, setActiveKey] = useState("");
    const [ctx, setCtx] = useState({});
    const [aspect, setAspect] = useState(null);
    const [quality, setQuality] = useState("high");
    const [title, setTitle] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [jobs, setJobs] = useState([]);
    const pollRef = useRef(null);

    useEffect(() => {
        Promise.all([
            adminApi.aiTemplates(),
            adminApi.list("players"),
            adminApi.list("matches"),
            adminApi.aiJobs(30),
        ]).then(([t, p, m, j]) => {
            setTemplates(t);
            setPlayers(p);
            setMatches(m);
            setJobs(j);
            if (t[0]) setActiveKey(t[0].key);
        });
    }, []);

    // Poll active jobs (pending/processing)
    useEffect(() => {
        const needsPoll = jobs.some((j) => j.status === "pending" || j.status === "processing");
        if (!needsPoll) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            return;
        }
        if (pollRef.current) return;
        pollRef.current = setInterval(async () => {
            try {
                const fresh = await adminApi.aiJobs(30);
                setJobs(fresh);
            } catch (_) {}
        }, 3000);
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [jobs]);

    const active = useMemo(() => templates.find((t) => t.key === activeKey), [templates, activeKey]);

    useEffect(() => {
        setCtx({});
        setAspect(active?.aspect_ratio || "1:1");
        setTitle("");
    }, [activeKey, active]);

    const setCtxField = (k, v) => setCtx((c) => ({ ...c, [k]: v }));

    const submit = async () => {
        if (!active) return;
        // Validate required inputs (basic presence check)
        for (const req of active.required_inputs) {
            const v = ctx[req];
            if (req === "players" || req === "player_ids") {
                if (!ctx.player_ids || ctx.player_ids.length === 0) {
                    toast.error("En az 1 oyuncu seçin"); return;
                }
            } else if (!v && v !== 0) {
                toast.error(`Eksik alan: ${req}`); return;
            }
        }
        setSubmitting(true);
        try {
            const job = await adminApi.aiGenerateTemplate({
                template_key: active.key,
                context: ctx,
                aspect_ratio: aspect,
                quality,
                title: title || undefined,
            });
            setJobs((j) => [job, ...j].slice(0, 30));
            toast.success("Üretim başlatıldı — sonuç hazır olduğunda görünecek");
        } catch (e) {
            const msg = e?.response?.data?.detail || e.message;
            toast.error("Başlatılamadı: " + msg);
        } finally { setSubmitting(false); }
    };

    const refreshJobs = async () => {
        const j = await adminApi.aiJobs(30);
        setJobs(j);
    };

    const needsPlayer = active?.required_inputs.includes("player_id");
    const needsPlayers = active?.required_inputs.includes("players") || active?.required_inputs.includes("player_ids");
    const needsMatch = active?.required_inputs.some((r) => ["home_team", "away_team", "match_date", "venue", "home_score", "away_score"].includes(r));

    return (
        <div className="space-y-8" data-testid="ai-studio">
            <div>
                <div className="overline">AI Medya Stüdyosu</div>
                <h1 className="font-display text-5xl md:text-6xl uppercase mt-1 inline-flex items-center gap-3"><Wand2 className="w-8 h-8 text-liv-yellow" /> Şablon Üretici</h1>
                <p className="text-sm text-neutral-400 mt-2">8 hazır sosyal medya şablonu. gpt-image-2 arka planda çalışır, üretim bitince görsel arşivde belirir (her üretim 1 kredi).</p>
            </div>

            {/* Template pills */}
            <div className="flex flex-wrap gap-2" data-testid="template-pills">
                {templates.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setActiveKey(t.key)}
                        data-testid={`template-pill-${t.key}`}
                        className={`px-4 py-2 border text-xs uppercase tracking-widest transition-colors ${activeKey === t.key ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border text-neutral-300 hover:border-liv-yellow"}`}
                    >
                        {t.name}
                    </button>
                ))}
            </div>

            {active && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-liv-card border border-liv-border p-6 space-y-4" data-testid="template-form">
                        <div>
                            <h2 className="font-display text-2xl uppercase">{active.name}</h2>
                            <p className="text-xs text-neutral-400 mt-1">{active.description}</p>
                        </div>

                        {/* Dynamic fields per template */}
                        {needsPlayer && (
                            <div>
                                <label className="liv-label">Oyuncu</label>
                                <select className="liv-input" value={ctx.player_id || ""} onChange={(e) => setCtxField("player_id", e.target.value)} data-testid="field-player">
                                    <option value="">— Seçin —</option>
                                    {players.map((p) => <option key={p.id} value={p.id}>#{p.jersey_number} · {p.name} ({p.position})</option>)}
                                </select>
                            </div>
                        )}

                        {needsPlayers && (
                            <div>
                                <label className="liv-label">İlk 11 Oyuncuları (en az 1, max 11)</label>
                                <select multiple className="liv-input !h-40" value={ctx.player_ids || []} onChange={(e) => setCtxField("player_ids", Array.from(e.target.selectedOptions).map((o) => o.value).slice(0, 11))} data-testid="field-players">
                                    {players.map((p) => <option key={p.id} value={p.id}>#{p.jersey_number} · {p.name} ({p.position})</option>)}
                                </select>
                                <div className="text-[10px] text-neutral-500 mt-1">Ctrl/Cmd tuşuyla çoklu seç ({(ctx.player_ids || []).length} seçili)</div>
                            </div>
                        )}

                        {active.key === "starting_xi" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="liv-label">Formasyon</label><input className="liv-input" value={ctx.formation || ""} placeholder="4-3-3" onChange={(e) => setCtxField("formation", e.target.value)} /></div>
                                <div><label className="liv-label">Rakip</label><input className="liv-input" value={ctx.opponent || ""} placeholder="Nilüfer FK" onChange={(e) => setCtxField("opponent", e.target.value)} /></div>
                            </div>
                        )}

                        {needsMatch && (
                            <div>
                                <label className="liv-label">Maç Seç (otomatik doldur)</label>
                                <select className="liv-input" value={ctx._match_id || ""} onChange={(e) => {
                                    const m = matches.find((mm) => mm.id === e.target.value);
                                    if (m) {
                                        setCtx((c) => ({
                                            ...c,
                                            _match_id: m.id,
                                            match_id: m.id,
                                            home_team: m.home_team,
                                            away_team: m.away_team,
                                            match_date: (m.match_date || "").slice(0, 10),
                                            venue: m.venue,
                                            competition: m.competition,
                                            home_score: m.home_score,
                                            away_score: m.away_score,
                                        }));
                                    } else {
                                        setCtxField("_match_id", "");
                                    }
                                }} data-testid="field-match">
                                    <option value="">— Elle gir —</option>
                                    {matches.map((m) => <option key={m.id} value={m.id}>{(m.match_date || "").slice(0, 10)} · {m.home_team} vs {m.away_team} ({m.status})</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div><label className="liv-label">Ev Sahibi</label><input className="liv-input" value={ctx.home_team || ""} onChange={(e) => setCtxField("home_team", e.target.value)} /></div>
                                    <div><label className="liv-label">Deplasman</label><input className="liv-input" value={ctx.away_team || ""} onChange={(e) => setCtxField("away_team", e.target.value)} /></div>
                                    <div><label className="liv-label">Tarih (YYYY-MM-DD)</label><input className="liv-input" value={ctx.match_date || ""} onChange={(e) => setCtxField("match_date", e.target.value)} /></div>
                                    <div><label className="liv-label">Stat / Yer</label><input className="liv-input" value={ctx.venue || ""} onChange={(e) => setCtxField("venue", e.target.value)} /></div>
                                    {active.required_inputs.includes("home_score") && (<>
                                        <div><label className="liv-label">Ev Skor</label><input type="number" className="liv-input" value={ctx.home_score ?? ""} onChange={(e) => setCtxField("home_score", Number(e.target.value))} /></div>
                                        <div><label className="liv-label">Dep Skor</label><input type="number" className="liv-input" value={ctx.away_score ?? ""} onChange={(e) => setCtxField("away_score", Number(e.target.value))} /></div>
                                    </>)}
                                </div>
                            </div>
                        )}

                        {active.key === "goal" && (
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="liv-label">Dakika</label><input className="liv-input" value={ctx.minute || ""} placeholder="67" onChange={(e) => setCtxField("minute", e.target.value)} /></div>
                                <div><label className="liv-label">Rakip (opsiyonel)</label><input className="liv-input" value={ctx.opponent || ""} onChange={(e) => setCtxField("opponent", e.target.value)} /></div>
                            </div>
                        )}

                        {active.key === "match_result" && (
                            <div><label className="liv-label">Gol Atanlar (virgülle)</label><input className="liv-input" value={(ctx.scorers || []).join(", ")} onChange={(e) => setCtxField("scorers", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Kerem 23', Cem 67'" /></div>
                        )}

                        {active.key === "new_transfer" && (
                            <div><label className="liv-label">Önceki Kulüp (opsiyonel)</label><input className="liv-input" value={ctx.from_club || ""} onChange={(e) => setCtxField("from_club", e.target.value)} /></div>
                        )}

                        {active.key === "player_of_week" && (
                            <div><label className="liv-label">İstatistikler JSON (ör. {"{"}"gol":2,"asist":1{"}"})</label>
                                <input className="liv-input" value={ctx._stats_str || ""} onChange={(e) => {
                                    setCtxField("_stats_str", e.target.value);
                                    try { setCtxField("stats", JSON.parse(e.target.value)); } catch { setCtxField("stats", {}); }
                                }} placeholder='{"gol": 2, "asist": 1}' /></div>
                        )}

                        {active.key === "fan_invite" && (
                            <div className="grid grid-cols-1 gap-3">
                                <div><label className="liv-label">Maç Metni</label><input className="liv-input" value={ctx.match_text || ""} placeholder="Pazar 19:00 Yolçatı" onChange={(e) => setCtxField("match_text", e.target.value)} /></div>
                                <div><label className="liv-label">Mesaj</label><input className="liv-input" value={ctx.message || ""} placeholder="Tribünlere bekliyoruz!" onChange={(e) => setCtxField("message", e.target.value)} /></div>
                            </div>
                        )}

                        {/* Common */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="liv-label">En Boy Oranı</label>
                                <select className="liv-input" value={aspect || "1:1"} onChange={(e) => setAspect(e.target.value)} data-testid="field-aspect">
                                    <option value="1:1">Kare 1:1</option>
                                    <option value="16:9">Yatay 16:9</option>
                                    <option value="4:5">Dikey 4:5</option>
                                    <option value="9:16">Story 9:16</option>
                                </select>
                            </div>
                            <div>
                                <label className="liv-label">Kalite</label>
                                <select className="liv-input" value={quality} onChange={(e) => setQuality(e.target.value)} data-testid="field-quality">
                                    <option value="high">Yüksek</option>
                                    <option value="medium">Orta</option>
                                    <option value="low">Düşük (hızlı)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="liv-label">Başlık (opsiyonel)</label>
                            <input className="liv-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Otomatik üretilecek" />
                        </div>

                        <button disabled={submitting} onClick={submit} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="submit-template">
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Kuyruğa alınıyor…</> : <><Wand2 className="w-4 h-4" /> Üretimi Başlat (1 kredi)</>}
                        </button>
                    </div>

                    {/* Jobs panel */}
                    <div className="bg-liv-card border border-liv-border p-6" data-testid="jobs-panel">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-display text-2xl uppercase">İşler</h3>
                            <button onClick={refreshJobs} className="text-xs text-neutral-400 hover:text-liv-yellow inline-flex items-center gap-1" data-testid="refresh-jobs"><RefreshCw className="w-3 h-3" /> Yenile</button>
                        </div>
                        {jobs.length === 0 && <div className="text-sm text-neutral-500">Henüz üretim yok.</div>}
                        <div className="space-y-3 max-h-[640px] overflow-y-auto">
                            {jobs.map((j) => (
                                <div key={j.id} className="border border-liv-border bg-liv-surface p-3" data-testid={`job-${j.id}`}>
                                    <div className="flex items-center gap-2 text-xs">
                                        <JobStatusIcon status={j.status} />
                                        <span className="uppercase tracking-widest text-neutral-400">{j.template_key}</span>
                                        <span className="ml-auto text-[10px] text-neutral-500">{(j.created_at || "").slice(11, 16)}</span>
                                    </div>
                                    {j.status === "success" && j.public_url && (
                                        <div className="mt-2">
                                            <img src={`${API.replace(/\/api$/, "")}${j.public_url}`} alt="" className="w-full aspect-square object-cover border border-liv-border" />
                                            <a href={`${API.replace(/\/api$/, "")}${j.public_url}`} download className="mt-2 text-xs text-liv-yellow hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> İndir</a>
                                        </div>
                                    )}
                                    {j.status === "error" && <div className="text-xs text-red-400 mt-1 line-clamp-3">{j.error}</div>}
                                    {j.status === "processing" && <div className="text-xs text-neutral-400 mt-1">gpt-image-2 çalışıyor (~20-60sn)…</div>}
                                    {j.status === "pending" && <div className="text-xs text-neutral-500 mt-1">Kuyrukta</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AiStudio;
