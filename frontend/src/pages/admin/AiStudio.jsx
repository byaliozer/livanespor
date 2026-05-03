import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi, API } from "@/lib/api";
import {
    Wand2, Loader2, Download, RefreshCw, CheckCircle2, XCircle, Clock,
    Sparkles, Paintbrush, Upload, X, Image as ImageIcon, Eye, Star, Plus,
    Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { Lightbox } from "@/components/admin/Lightbox";
import { FieldHelpPanel } from "@/components/admin/FieldHelpPanel";
import { formatDateTR, formatTimeTR } from "@/lib/dateFormat";

// URL helper for public media proxy
const mediaAbsUrl = (pathOrDataUrl) => {
    if (!pathOrDataUrl) return "";
    if (pathOrDataUrl.startsWith("data:") || pathOrDataUrl.startsWith("http")) return pathOrDataUrl;
    try {
        const origin = new URL(API).origin;
        return `${origin}${pathOrDataUrl}`;
    } catch { return pathOrDataUrl; }
};

const StatusIcon = ({ status }) => {
    if (status === "success") return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === "error") return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === "processing") return <Loader2 className="w-4 h-4 animate-spin text-liv-yellow" />;
    return <Clock className="w-4 h-4 text-neutral-400" />;
};

// File → data URL (max 5MB)
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) return reject(new Error("Dosya 5MB'tan büyük olamaz"));
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
});

const RefImageSlot = ({ label, value, onChange, testid }) => {
    const pick = async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        try { onChange(await fileToDataUrl(f)); }
        catch (err) { toast.error(err.message); }
    };
    return (
        <div className="border border-liv-border bg-liv-surface p-2" data-testid={`ref-${testid}`}>
            <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">{label}</div>
            {value ? (
                <div className="relative">
                    <img src={value} alt={label} className="w-full h-24 object-contain bg-black" />
                    <button onClick={() => onChange(null)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 flex items-center justify-center"><X className="w-3 h-3" /></button>
                </div>
            ) : (
                <label className="cursor-pointer h-24 flex items-center justify-center border-2 border-dashed border-liv-border hover:border-liv-yellow">
                    <Upload className="w-4 h-4 text-neutral-500" />
                    <input type="file" accept="image/*" onChange={pick} className="hidden" data-testid={`ref-${testid}-input`} />
                </label>
            )}
        </div>
    );
};

const DesignCustomizer = ({ options, custom, setCustom, values, setValues }) => (
    <div className="border border-liv-border bg-liv-surface p-4 space-y-3" data-testid="design-customizer">
        <div className="text-xs uppercase tracking-widest text-neutral-400">Görseli özelleştirmek ister misin?</div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setCustom(false)} data-testid="design-mode-akilli"
                className={`py-2.5 text-xs font-semibold border ${!custom ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border text-neutral-300"}`}>
                <div className="inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Akıllı Seçim</div>
                <div className="text-[10px] opacity-70 font-normal mt-0.5">(varsayılan · DNA)</div>
            </button>
            <button onClick={() => setCustom(true)} data-testid="design-mode-ozellestir"
                className={`py-2.5 text-xs font-semibold border ${custom ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border text-neutral-300"}`}>
                <div className="inline-flex items-center gap-1.5"><Paintbrush className="w-3.5 h-3.5" /> Özelleştir</div>
                <div className="text-[10px] opacity-70 font-normal mt-0.5">(manuel kontrol)</div>
            </button>
        </div>
        {!custom ? (
            <p className="text-[11px] text-neutral-500">AI, kulübünün DNA'sına göre en iyi kombinasyonu seçer. Her kulüp benzersiz — Canva hissi yok.</p>
        ) : (
            <div className="space-y-3 pt-2 border-t border-liv-border">
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Düzen</div>
                    <select value={values.layout || ""} onChange={(e) => setValues({ ...values, layout: e.target.value })} className="liv-input" data-testid="design-layout">
                        <option value="">Akıllı Seçim (önerilen)</option>
                        {(options?.layouts || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Tipografi</div>
                    <select value={values.typography || ""} onChange={(e) => setValues({ ...values, typography: e.target.value })} className="liv-input" data-testid="design-typography">
                        <option value="">Akıllı Seçim</option>
                        {(options?.typographies || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400 mb-1">Sahne / Atmosfer</div>
                    <select value={values.scene || ""} onChange={(e) => setValues({ ...values, scene: e.target.value })} className="liv-input" data-testid="design-scene">
                        <option value="">Akıllı Seçim</option>
                        {(options?.scenes || []).map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5" data-testid="design-drama">
                    <div className="flex justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Dramatizm</span>
                        <span className="text-[11px] text-liv-yellow font-semibold">{["", "Minimal", "Dengeli", "Yüksek"][values.drama || 2]}</span>
                    </div>
                    <input type="range" min={1} max={3} step={1} value={values.drama || 2} onChange={(e) => setValues({ ...values, drama: parseInt(e.target.value, 10) })} className="w-full accent-liv-yellow" />
                </div>
                <div className="space-y-1.5 pt-1 border-t border-liv-border/50">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-400">Marka İmzası (opsiyonel)</div>
                    <label className="flex items-start gap-2 text-[11px] text-neutral-300 cursor-pointer">
                        <input type="checkbox" checked={!!values.show_city} onChange={(e) => setValues({ ...values, show_city: e.target.checked })} className="mt-0.5 accent-liv-yellow" data-testid="design-show-city" />
                        <span>Şehir motifi ekle (settings'teki city kullanılır)</span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] text-neutral-300 cursor-pointer">
                        <input type="checkbox" checked={!!values.show_year} onChange={(e) => setValues({ ...values, show_year: e.target.checked })} className="mt-0.5 accent-liv-yellow" data-testid="design-show-year" />
                        <span>Kuruluş yılı ekle ("EST. YYYY" köşede)</span>
                    </label>
                </div>
            </div>
        )}
    </div>
);

const DR_AI_BRAND_LOGO_URL = "https://customer-assets.emergentagent.com/job_e3c41e44-f658-4a09-9344-a2e1f942a7ee/artifacts/8ntz1cbb_drailogo-1.png";

// Template-level placement hint shown to admin (matches backend _SIGNATURE_PLACEMENT)
const SIGNATURE_PLACEMENT_LABEL = {
    match_week:   "Sol alt köşe · Sağ alt köşe",
    match_day:    "Sol alt köşe · Sağ alt köşe",
    full_time:    "Sol alt köşe · Sağ alt köşe",
    lineup:       "Sol alt köşe · Sağ alt köşe",
    motm:         "Sağ alt, iki satır istiflenmiş",
    birthday:     "Sağ alt, iki satır istiflenmiş",
    new_transfer: "Sağ alt, iki satır istiflenmiş",
    special_day:  "Alt orta şerit (tek satır)",
    fan_invite:   "Alt orta şerit (tek satır)",
};

const SignatureBlock = ({ templateKey, siteS, ctx, setCtxField }) => {
    const defaultWeb = (siteS?.website || "").trim();
    const defaultIg  = (siteS?.instagram_username || (siteS?.social || {}).instagram || "").trim();
    const showWeb = ctx.show_website !== false;
    const showIg  = ctx.show_instagram !== false;
    const showBrand = ctx.show_brand_logo !== false;
    const webVal = ctx.website_text !== undefined ? ctx.website_text : defaultWeb;
    const igVal  = ctx.instagram_text !== undefined ? ctx.instagram_text : defaultIg;
    const brandVal = ctx.brand_logo_url !== undefined ? ctx.brand_logo_url : DR_AI_BRAND_LOGO_URL;
    const placement = SIGNATURE_PLACEMENT_LABEL[templateKey] || "Sol alt · Sağ alt";
    const brandActive = showBrand;
    // When brand is active, layout forced to 3-zone: SOL=web · ORTA=brand · SAĞ=instagram
    const effectivePlacement = brandActive ? "Sol alt · DR AI FUTBOL · Sağ alt" : placement;

    return (
        <div className="bg-liv-card border border-liv-border p-6 space-y-3" data-testid="signature-block">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h3 className="font-display text-lg uppercase">Marka İmzası (opsiyonel)</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">Görselin alt kısmına web sitesi, DR AI FUTBOL logosu ve Instagram yazılır. Boş bıraktığın alanlar Site Ayarları'ndan otomatik alınır.</p>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-liv-yellow" data-testid="signature-placement-hint">Konum: {effectivePlacement}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-liv-border bg-liv-surface p-3 rounded-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={showWeb} onChange={(e) => setCtxField("show_website", e.target.checked)} className="accent-liv-yellow" data-testid="signature-show-web" />
                        <span className="font-semibold text-neutral-200">Web sitesi ekle</span>
                    </label>
                    <input
                        type="text"
                        className="liv-input mt-2 !py-1.5"
                        value={webVal}
                        onChange={(e) => setCtxField("website_text", e.target.value)}
                        placeholder={defaultWeb || "www.livanespor.org"}
                        disabled={!showWeb}
                        data-testid="signature-web-input"
                    />
                    {defaultWeb && ctx.website_text !== undefined && ctx.website_text !== defaultWeb && (
                        <button type="button" onClick={() => setCtxField("website_text", undefined)} className="text-[10px] text-liv-yellow hover:underline mt-1 uppercase tracking-widest">Site Ayarları'nı kullan ({defaultWeb})</button>
                    )}
                </div>

                <div className="border border-liv-border bg-liv-surface p-3 rounded-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={showBrand} onChange={(e) => setCtxField("show_brand_logo", e.target.checked)} className="accent-liv-yellow" data-testid="signature-show-brand" />
                        <span className="font-semibold text-neutral-200">DR AI FUTBOL logosu ekle</span>
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                        <img src={brandVal} alt="DR AI FUTBOL" className={`h-10 w-16 object-contain bg-black border border-liv-border ${!showBrand ? "opacity-30" : ""}`} data-testid="signature-brand-preview" />
                        <div className="flex-1">
                            <input
                                type="text"
                                className="liv-input !py-1.5 text-xs"
                                value={brandVal}
                                onChange={(e) => setCtxField("brand_logo_url", e.target.value)}
                                placeholder="Logo URL"
                                disabled={!showBrand}
                                data-testid="signature-brand-input"
                            />
                            {ctx.brand_logo_url !== undefined && ctx.brand_logo_url !== DR_AI_BRAND_LOGO_URL && (
                                <button type="button" onClick={() => setCtxField("brand_logo_url", undefined)} className="text-[10px] text-liv-yellow hover:underline mt-1 uppercase tracking-widest">Varsayılana dön</button>
                            )}
                        </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 mt-1">Seçili ise görselin alt ortasına yerleşir.</p>
                </div>

                <div className="border border-liv-border bg-liv-surface p-3 rounded-sm">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input type="checkbox" checked={showIg} onChange={(e) => setCtxField("show_instagram", e.target.checked)} className="accent-liv-yellow" data-testid="signature-show-ig" />
                        <span className="font-semibold text-neutral-200">Instagram ekle</span>
                    </label>
                    <input
                        type="text"
                        className="liv-input mt-2 !py-1.5"
                        value={igVal}
                        onChange={(e) => setCtxField("instagram_text", e.target.value)}
                        placeholder={defaultIg || "livanespor"}
                        disabled={!showIg}
                        data-testid="signature-ig-input"
                    />
                    {defaultIg && ctx.instagram_text !== undefined && ctx.instagram_text !== defaultIg && (
                        <button type="button" onClick={() => setCtxField("instagram_text", undefined)} className="text-[10px] text-liv-yellow hover:underline mt-1 uppercase tracking-widest">Site Ayarları'nı kullan (@{defaultIg.replace(/^@/, "")})</button>
                    )}
                </div>
            </div>

            {!defaultWeb && !defaultIg && (
                <p className="text-[11px] text-amber-300">ℹ Web/Instagram varsayılanları için <strong>Site Ayarları → Sosyal Medya</strong> bölümüne değer ekleyin.</p>
            )}
            {brandActive && (
                <p className="text-[11px] text-liv-yellow/80">ℹ DR AI FUTBOL logosu aktif: Yerleşim sol alt web, orta logo, sağ alt Instagram düzenine geçer. (Şablon-bazlı varsayılan konum geçici olarak değişir.)</p>
            )}
        </div>
    );
};


const AiStudio = () => {
    const [templates, setTemplates] = useState([]);
    const [designOptions, setDesignOptions] = useState(null);
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [teamPhotos, setTeamPhotos] = useState([]);
    const [activeKey, setActiveKey] = useState("");
    const [ctx, setCtx] = useState({});
    const [siteS, setSiteS] = useState({});  // site_settings for signature defaults
    const [aspect, setAspect] = useState(null);
    const [quality, setQuality] = useState("high");
    const [title, setTitle] = useState("");
    const [variationCount, setVariationCount] = useState(1);
    // Design customizer state
    const [customDesign, setCustomDesign] = useState(false);
    const [customVals, setCustomVals] = useState({ drama: 2 });
    // Reference images: home_crest, away_crest, team_photo (data urls)
    const [refs, setRefs] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [jobs, setJobs] = useState([]);
    // Gallery
    const [gallery, setGallery] = useState([]);
    const [seeding, setSeeding] = useState(false);
    // Lightbox
    const [lbOpen, setLbOpen] = useState(false);
    const [lbItems, setLbItems] = useState([]);
    const [lbIdx, setLbIdx] = useState(0);
    const pollRef = useRef(null);

    useEffect(() => {
        Promise.all([
            adminApi.aiTemplates(),
            adminApi.aiDesignOptions(),
            adminApi.list("players"),
            adminApi.list("matches"),
            adminApi.list("team_photos"),
            adminApi.aiJobs(30),
            adminApi.settings(),
        ]).then(([t, d, p, m, tp, j, ss]) => {
            setTemplates(t); setDesignOptions(d); setPlayers(p); setMatches(m);
            setTeamPhotos((tp || []).filter((x) => x.active !== false));
            setJobs(j); setSiteS(ss || {});
            if (t[0]) setActiveKey(t[0].key);
        }).catch((e) => toast.error("Veri yüklenemedi: " + e.message));
    }, []);

    // Poll active jobs — also keep polling briefly after success to pick up async caption
    useEffect(() => {
        const nowMs = Date.now();
        // Job considered "recent" if finished within last 2 minutes
        const recentSuccessMissingCaption = jobs.some((j) => {
            if (j.status !== "success" || j.social_caption) return false;
            const fin = j.finished_at ? Date.parse(j.finished_at) : 0;
            return fin && (nowMs - fin) < 120000;
        });
        const needsPoll = jobs.some((j) => j.status === "pending" || j.status === "processing") || recentSuccessMissingCaption;
        if (!needsPoll) {
            if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
            return;
        }
        if (pollRef.current) return;
        pollRef.current = setInterval(async () => {
            try { setJobs(await adminApi.aiJobs(30)); } catch (_) {}
        }, 3000);
        return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    }, [jobs]);

    const active = useMemo(() => templates.find((t) => t.key === activeKey), [templates, activeKey]);

    useEffect(() => {
        setCtx({}); setRefs({}); setTitle("");
        setAspect(active?.aspect_ratio || "1:1");
        // Load gallery for this template
        if (active?.key) {
            adminApi.galleryList(active.key, 12).then(setGallery).catch(() => setGallery([]));
        }
    }, [activeKey, active]);

    const setCtxField = (k, v) => setCtx((c) => ({ ...c, [k]: v }));

    const submit = async () => {
        if (!active) return;
        // Basic required validation
        for (const req of active.required_inputs) {
            if (req === "players") {
                if (!ctx.player_ids || ctx.player_ids.length < 5) { toast.error("En az 5 oyuncu seçin"); return; }
            } else if (!ctx[req] && ctx[req] !== 0 && req !== "player_id") {
                toast.error(`Eksik alan: ${req}`); return;
            } else if (req === "player_id" && !ctx.player_id) {
                toast.error("Oyuncu seçin"); return;
            }
        }
        // Build reference_images array based on slot definitions
        const ref_images = [];
        const slots = active.reference_slots || [];
        for (const slot of slots) {
            const key = slot.replace("?", "");
            if (refs[key]) ref_images.push(refs[key]);
        }
        setSubmitting(true);
        try {
            const res = await adminApi.aiGenerateTemplate({
                template_key: active.key,
                context: ctx,
                aspect_ratio: aspect,
                quality,
                title: title || undefined,
                variation_count: variationCount,
                custom_design: customDesign,
                custom_layout: customVals.layout || null,
                custom_typography: customVals.typography || null,
                custom_scene: customVals.scene || null,
                custom_drama: customVals.drama || null,
                custom_show_city: !!customVals.show_city,
                custom_show_year: !!customVals.show_year,
                reference_images: ref_images,
            });
            setJobs((prev) => [...(res.jobs || []), ...prev].slice(0, 50));
            toast.success(`${variationCount} varyasyon üretimi başlatıldı (${variationCount} kredi düşüldü)`);
        } catch (e) {
            toast.error("Başlatılamadı: " + (e?.response?.data?.detail || e.message));
        } finally { setSubmitting(false); }
    };

    const refreshJobs = async () => setJobs(await adminApi.aiJobs(30));

    // When jobs update via polling, sync lightbox items so newly-arrived captions show up live
    useEffect(() => {
        if (!lbOpen || lbItems.length === 0) return;
        setLbItems((prev) => prev.map((item) => {
            const j = jobs.find((x) => x.public_url && mediaAbsUrl(x.public_url) === item.url);
            if (!j) return item;
            const social = j.social_caption;
            if (social && !item.social_caption) {
                return { ...item, social_caption: social, expecting_caption: false };
            }
            return item;
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobs, lbOpen]);

    const openJobLightbox = (job) => {
        const successJobs = jobs.filter((j) => j.status === "success" && j.public_url);
        const startIdx = successJobs.findIndex((j) => j.id === job.id);
        setLbItems(successJobs.map((j) => ({
            url: mediaAbsUrl(j.public_url),
            template_key: j.template_key,
            design: j.design,
            social_caption: j.social_caption,
            expecting_caption: !j.social_caption,
            filename: `${j.template_key}_${j.id.slice(0, 8)}.png`,
        })));
        setLbIdx(Math.max(0, startIdx));
        setLbOpen(true);
    };

    const openGalleryLightbox = (item) => {
        const startIdx = gallery.findIndex((g) => g.id === item.id);
        setLbItems(gallery.map((g) => ({
            url: mediaAbsUrl(g.public_url),
            template_key: g.template_key,
            design: g.design,
            filename: `${g.template_key}_${g.id.slice(0, 8)}.png`,
        })));
        setLbIdx(Math.max(0, startIdx));
        setLbOpen(true);
    };

    const applyGalleryDna = (item) => {
        if (!item?.design) return;
        setCustomDesign(true);
        setCustomVals({
            layout: item.design.layout,
            typography: item.design.typography,
            scene: item.design.scene,
            drama: item.design.drama,
        });
        toast.success("DNA uygulandı — formu doldurup üret'e basın");
    };

    const togglePublish = async (job) => {
        try {
            if (job.published_to_gallery) {
                await adminApi.galleryUnpublish(job.id);
                toast.success("Galeriden kaldırıldı");
            } else {
                await adminApi.galleryPublish(job.id);
                toast.success("Galeriye eklendi (kulüp bilgisi gizlenir)");
            }
            await refreshJobs();
            if (active?.key) setGallery(await adminApi.galleryList(active.key, 12));
        } catch (e) { toast.error("İşlem başarısız: " + (e?.response?.data?.detail || e.message)); }
    };

    const seedGallery = async () => {
        if (!active) return;
        if (!window.confirm(`${active.name} için 3 yüksek kaliteli galeri örneği üretilecek (3 kredi). Onaylıyor musunuz?`)) return;
        setSeeding(true);
        try {
            const res = await adminApi.gallerySeed(active.key, 3, "high");
            setJobs((prev) => [...(res.jobs || []), ...prev].slice(0, 50));
            toast.success(`${res.count} galeri seed üretimi başlatıldı (HIGH kalite)`);
        } catch (e) {
            toast.error("Seed başarısız: " + (e?.response?.data?.detail || e.message));
        } finally { setSeeding(false); }
    };

    const importGalleryFromPreview = async () => {
        const PREVIEW_URL = "https://spor-panel-pro.preview.emergentagent.com";
        if (!window.confirm(
            `Önizleme ortamından (${PREVIEW_URL}) tüm 9 şablonun galeri örnekleri bu ortama kopyalanacak.\n\n` +
            `• Kredi tüketmez (görseller zaten üretilmiş, sadece kopyalanır).\n` +
            `• Tekrar çalıştırılırsa zaten kopyalananlar atlanır.\n\nDevam edilsin mi?`
        )) return;
        setSeeding(true);
        try {
            const res = await adminApi.galleryImportFromSource(PREVIEW_URL, 6);
            toast.success(`İçe aktarma tamamlandı — ${res.imported} eklendi, ${res.skipped} atlandı, ${res.failed} hata.`);
            if (active?.key) setGallery(await adminApi.galleryList(active.key, 12));
        } catch (e) {
            toast.error("İçe aktarma başarısız: " + (e?.response?.data?.detail || e.message));
        } finally { setSeeding(false); }
    };

    const needsPlayer = active?.required_inputs.includes("player_id");
    const needsPlayers = active?.required_inputs.includes("players");
    const needsMatch = active?.required_inputs.some((r) => ["home_name", "away_name", "home_score", "away_score"].includes(r));
    const slots = active?.reference_slots || [];

    return (
        <div className="space-y-6" data-testid="ai-studio">
            <div>
                <div className="overline">AI Medya Stüdyosu</div>
                <h1 className="font-display text-5xl md:text-6xl uppercase mt-1 inline-flex items-center gap-3">
                    <Wand2 className="w-8 h-8 text-liv-yellow" /> AI Stüdyo
                </h1>
                <p className="text-sm text-neutral-400 mt-2">
                    DR AI Image 2 — Her görsel 1 kredi harcar.
                </p>
            </div>

            {/* Template pills (sorted by order) */}
            <div className="flex flex-wrap gap-2" data-testid="template-pills">
                {templates.map((t) => (
                    <button key={t.key} onClick={() => setActiveKey(t.key)} data-testid={`template-pill-${t.key}`}
                        className={`px-4 py-2 border text-xs uppercase tracking-widest transition-colors ${activeKey === t.key ? "bg-liv-yellow text-black border-liv-yellow" : "bg-liv-card border-liv-border text-neutral-300 hover:border-liv-yellow"}`}>
                        {t.name}
                    </button>
                ))}
            </div>

            {active && (
                <>
                {/* Gallery — örnek tasarımlar */}
                <div className="bg-liv-card border border-liv-border p-6" data-testid="gallery-panel">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div>
                            <h3 className="font-display text-2xl uppercase inline-flex items-center gap-2"><Eye className="w-5 h-5 text-liv-yellow" /> Örnek Tasarımlar — {active.name}</h3>
                            <p className="text-[11px] text-neutral-500 mt-0.5">Bu şablonun farklı Design DNA'larıyla üretilmiş yüksek kaliteli örnekleri. Beğendiğin DNA'yı tek tıkla kullan.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button onClick={importGalleryFromPreview} disabled={seeding} className="btn-secondary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-60 border-liv-yellow/40 text-liv-yellow hover:bg-liv-yellow/10" data-testid="gallery-import-btn" title="Önizleme ortamından tüm 9 şablonun galeri örneklerini bu ortama kopyalar — kredi tüketmez">
                                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Önizlemeden İçe Aktar (Ücretsiz)
                            </button>
                            <button onClick={seedGallery} disabled={seeding} className="btn-secondary !py-2 !px-3 !text-xs inline-flex items-center gap-1.5 disabled:opacity-60" data-testid="gallery-seed-btn">
                                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Galeriye 3 Örnek Ekle (3 kredi · HIGH)
                            </button>
                        </div>
                    </div>
                    {gallery.length === 0 ? (
                        <div className="text-sm text-neutral-500 py-8 text-center border border-dashed border-liv-border">
                            Bu şablon için henüz galeri örneği yok.<br />
                            <span className="text-xs">Üst sağdan "Galeriye 3 Örnek Ekle" diyerek HIGH kalitede seed üretebilir, ya da kendi başarılı işlerinizden ekleyebilirsiniz.</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="gallery-grid">
                            {gallery.map((g) => (
                                <div key={g.id} className="group relative bg-black border border-liv-border overflow-hidden cursor-pointer" data-testid={`gallery-item-${g.id}`} onClick={() => openGalleryLightbox(g)}>
                                    <img src={mediaAbsUrl(g.public_url)} alt={g.template_key} className="w-full aspect-square object-cover" loading="lazy" />
                                    {g.design && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/85 px-2 py-1.5 text-[9px] text-neutral-300 pointer-events-none">
                                            {g.design.layout} · {g.design.scene} · {g.design.typography} · D{g.design.drama}
                                        </div>
                                    )}
                                    <div className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Maximize2 className="w-3.5 h-3.5 text-white" /></div>
                                    <button onClick={(e) => { e.stopPropagation(); applyGalleryDna(g); }} data-testid={`gallery-use-${g.id}`}
                                        className="absolute inset-x-0 top-0 bg-liv-yellow text-black text-[10px] font-bold uppercase tracking-widest py-1.5 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center gap-1">
                                        <Star className="w-3 h-3" /> Bu DNA'yı Kullan
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: dynamic form */}
                    <div className="lg:col-span-2 space-y-4" data-testid="template-form">
                        <div className="bg-liv-card border border-liv-border p-6 space-y-4">
                            <div>
                                <h2 className="font-display text-2xl uppercase">{active.name}</h2>
                                <p className="text-xs text-neutral-400 mt-1">{active.description}</p>
                            </div>

                            <FieldHelpPanel templateKey={active.key} />

                            {/* Dynamic fields per template */}
                            {needsPlayer && (
                                <div>
                                    <label className="liv-label">Oyuncu</label>
                                    <select className="liv-input" value={ctx.player_id || ""} onChange={(e) => setCtxField("player_id", e.target.value)} data-testid="field-player">
                                        <option value="">— Seçin —</option>
                                        {players.map((p) => <option key={p.id} value={p.id}>{`#${p.jersey_number} · ${p.name} (${p.position})`}</option>)}
                                    </select>
                                </div>
                            )}

                            {needsPlayers && (
                                <>
                                    <div>
                                        <label className="liv-label">İlk 11 Oyuncuları (sıra önemli — 11 tane seçin)</label>
                                        <select multiple className="liv-input !h-48" value={ctx.player_ids || []} onChange={(e) => setCtxField("player_ids", Array.from(e.target.selectedOptions).map((o) => o.value).slice(0, 11))} data-testid="field-players">
                                            {players.map((p) => <option key={p.id} value={p.id}>{`#${p.jersey_number} · ${p.name} (${p.position})`}</option>)}
                                        </select>
                                        <div className="text-[10px] text-neutral-500 mt-1">{(ctx.player_ids || []).length} seçili · Ctrl/Cmd ile çoklu</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="liv-label">Formasyon</label><input className="liv-input" value={ctx.formation || ""} placeholder="4-3-3" onChange={(e) => setCtxField("formation", e.target.value)} /></div>
                                        <div><label className="liv-label">Rakip (opsiyonel)</label><input className="liv-input" value={ctx.away_name || ""} onChange={(e) => setCtxField("away_name", e.target.value)} /></div>
                                    </div>
                                    <div><label className="liv-label">Teknik Direktör (opsiyonel)</label><input className="liv-input" value={ctx.coach || ""} onChange={(e) => setCtxField("coach", e.target.value)} /></div>
                                </>
                            )}

                            {needsMatch && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="liv-label">Maç Seç (otomatik doldur)</label>
                                        <select className="liv-input" value={ctx._match_id || ""} onChange={async (e) => {
                                            const m = matches.find((mm) => mm.id === e.target.value);
                                            if (m) {
                                                const TR_DAYS = ["PAZAR","PAZARTESİ","SALI","ÇARŞAMBA","PERŞEMBE","CUMA","CUMARTESİ"];
                                                const dt = m.match_date ? new Date(m.match_date) : null;
                                                const dayStr = dt && !isNaN(dt) ? TR_DAYS[dt.getDay()] : "";
                                                setCtx((c) => ({
                                                    ...c, _match_id: m.id,
                                                    home_name: m.home_team, away_name: m.away_team,
                                                    date_str: formatDateTR(m.match_date),
                                                    time_str: formatTimeTR(m.match_date),
                                                    day_str: dayStr,
                                                    stadium: m.venue, league_display: m.competition,
                                                    home_score: m.home_score, away_score: m.away_score,
                                                }));
                                                // Pre-fill crest reference slots from site_settings + opponent_clubs
                                                try {
                                                    const cr = await adminApi.resolveCrests(m.home_team, m.away_team);
                                                    setRefs((r) => ({
                                                        ...r,
                                                        ...(cr.home_crest_url && !r.home_crest ? { home_crest: cr.home_crest_url } : {}),
                                                        ...(cr.away_crest_url && !r.away_crest ? { away_crest: cr.away_crest_url } : {}),
                                                    }));
                                                    if (!cr.home_crest_url || !cr.away_crest_url) {
                                                        const missing = [];
                                                        if (!cr.home_crest_url) missing.push(m.home_team);
                                                        if (!cr.away_crest_url) missing.push(m.away_team);
                                                        toast.warning(`${missing.join(", ")} için logo bulunamadı — Rakip Kulüpler'den ekleyin veya elle yükleyin.`);
                                                    }
                                                } catch (_) {}
                                            } else { setCtxField("_match_id", ""); }
                                        }} data-testid="field-match">
                                            <option value="">— Elle gir —</option>
                                            {matches.map((m) => <option key={m.id} value={m.id}>{`${formatDateTR(m.match_date)} · ${m.home_team} vs ${m.away_team} (${m.status})`}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="liv-label">Ev Sahibi</label><input className="liv-input" value={ctx.home_name || ""} onChange={(e) => setCtxField("home_name", e.target.value)} /></div>
                                        <div><label className="liv-label">Deplasman</label><input className="liv-input" value={ctx.away_name || ""} onChange={(e) => setCtxField("away_name", e.target.value)} /></div>
                                        <div><label className="liv-label">Tarih</label><input className="liv-input" value={ctx.date_str || ""} placeholder="02.06.2026" onChange={(e) => setCtxField("date_str", e.target.value)} /></div>
                                        <div><label className="liv-label">Saat</label><input className="liv-input" value={ctx.time_str || ""} placeholder="19:00" onChange={(e) => setCtxField("time_str", e.target.value)} /></div>
                                        {(active.key === "fan_invite" || active.key === "lineup" || active.key === "match_week" || active.key === "match_day" || active.key === "full_time") && (
                                            <div className="col-span-2"><label className="liv-label">Gün (Otomatik veya Elle)</label><input className="liv-input" value={ctx.day_str || ""} placeholder="PAZAR" onChange={(e) => setCtxField("day_str", e.target.value.toUpperCase())} data-testid="field-day-str" /></div>
                                        )}
                                        <div className="col-span-2"><label className="liv-label">Stat</label><input className="liv-input" value={ctx.stadium || ""} onChange={(e) => setCtxField("stadium", e.target.value)} /></div>
                                        <div className="col-span-2"><label className="liv-label">Lig / Maç Tipi</label><input className="liv-input" value={ctx.league_display || ""} placeholder="BAL Ligi 4. Grup" onChange={(e) => setCtxField("league_display", e.target.value)} /></div>
                                        {active.required_inputs.includes("home_score") && (<>
                                            <div><label className="liv-label">Ev Skor</label><input type="number" className="liv-input" value={ctx.home_score ?? ""} onChange={(e) => setCtxField("home_score", Number(e.target.value))} /></div>
                                            <div><label className="liv-label">Dep Skor</label><input type="number" className="liv-input" value={ctx.away_score ?? ""} onChange={(e) => setCtxField("away_score", Number(e.target.value))} /></div>
                                        </>)}
                                    </div>
                                </div>
                            )}

                            {active.key === "special_day" && (
                                <>
                                    <div><label className="liv-label">Başlık</label><input className="liv-input" value={ctx.title || ""} placeholder="23 NİSAN" onChange={(e) => setCtxField("title", e.target.value)} data-testid="field-title" /></div>
                                    <div><label className="liv-label">Gövde Metni</label><textarea rows={3} className="liv-input" value={ctx.body_text || ""} placeholder="23 Nisan Ulusal Egemenlik ve Çocuk Bayramı kutlu olsun." onChange={(e) => setCtxField("body_text", e.target.value)} data-testid="field-body-text" /></div>
                                    <div><label className="liv-label">Tür İpucu (opsiyonel)</label><input className="liv-input" value={ctx.occasion_hint || ""} placeholder="resmi bayram / dini bayram / kuruluş yıldönümü" onChange={(e) => setCtxField("occasion_hint", e.target.value)} data-testid="field-occasion-hint" /></div>
                                </>
                            )}

                            {active.key === "new_transfer" && (
                                <div><label className="liv-label">Önceki Kulüp (opsiyonel)</label><input className="liv-input" value={ctx.from_club || ""} onChange={(e) => setCtxField("from_club", e.target.value)} data-testid="field-from-club" /></div>
                            )}

                            {active.key === "fan_invite" && (
                                <div><label className="liv-label">Vurgu Mesajı (opsiyonel · 1-2 satır)</label><input className="liv-input" value={ctx.message || ""} placeholder="Sarı-Siyah Aşk Bizim!" onChange={(e) => setCtxField("message", e.target.value)} data-testid="field-message" /></div>
                            )}

                            {active.key === "motm" && (
                                <>
                                    <div><label className="liv-label">Alt Başlık (opsiyonel)</label><input className="liv-input" value={ctx.subtitle || ""} placeholder="3. Hafta" onChange={(e) => setCtxField("subtitle", e.target.value)} data-testid="field-subtitle" /></div>
                                    <div><label className="liv-label">Maç Bağlamı (opsiyonel)</label><input className="liv-input" value={ctx.match_context || ""} placeholder="Livanespor 3-1 Gemlik" onChange={(e) => setCtxField("match_context", e.target.value)} data-testid="field-match-context" /></div>
                                </>
                            )}

                            {active.key === "full_time" && (
                                <>
                                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                                        <input type="checkbox" checked={!!ctx.show_goals} onChange={(e) => setCtxField("show_goals", e.target.checked)} className="accent-liv-yellow" />
                                        Gol Atanlar panelini göster
                                    </label>
                                    {ctx.show_goals && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="liv-label">Ev Gol Atanlar (İSİM 23' format, virgülle)</label>
                                                <input className="liv-input" value={ctx._home_goals_str || ""} onChange={(e) => {
                                                    setCtxField("_home_goals_str", e.target.value);
                                                    setCtxField("home_goals", e.target.value.split(",").map((s) => { const [n, m] = s.split(" "); return { player_name: (n || "").trim(), minute: parseInt((m || "").replace("'", ""), 10) || null }; }).filter((x) => x.player_name));
                                                }} placeholder="KEREM 23, CEM 67" /></div>
                                            <div><label className="liv-label">Dep Gol Atanlar</label>
                                                <input className="liv-input" value={ctx._away_goals_str || ""} onChange={(e) => {
                                                    setCtxField("_away_goals_str", e.target.value);
                                                    setCtxField("away_goals", e.target.value.split(",").map((s) => { const [n, m] = s.split(" "); return { player_name: (n || "").trim(), minute: parseInt((m || "").replace("'", ""), 10) || null }; }).filter((x) => x.player_name));
                                                }} /></div>
                                        </div>
                                    )}
                                    <div><label className="liv-label">Skor Tipi</label>
                                        <select className="liv-input" value={ctx.score_type || "normal"} onChange={(e) => setCtxField("score_type", e.target.value)}>
                                            <option value="normal">Normal</option><option value="penalty">Penaltılar</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div><label className="liv-label">Ek Vurgu Metni (opsiyonel)</label><input className="liv-input" value={ctx.extra_text || ""} onChange={(e) => setCtxField("extra_text", e.target.value)} /></div>

                            {/* Aspect / Quality / Variation / Title */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="liv-label">En Boy</label>
                                    <select className="liv-input" value={aspect || "1:1"} onChange={(e) => setAspect(e.target.value)} data-testid="field-aspect">
                                        <option value="1:1">Kare 1:1</option><option value="16:9">16:9</option><option value="4:5">4:5</option><option value="9:16">Story 9:16</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="liv-label">Kalite</label>
                                    <select className="liv-input" value={quality} onChange={(e) => setQuality(e.target.value)} data-testid="field-quality">
                                        <option value="high">Yüksek</option><option value="medium">Orta</option><option value="low">Düşük</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="liv-label">Varyasyon</label>
                                    <select className="liv-input" value={variationCount} onChange={(e) => setVariationCount(parseInt(e.target.value, 10))} data-testid="field-variation">
                                        <option value={1}>1 varyasyon (1 kredi)</option>
                                        <option value={3}>3 varyasyon (3 kredi)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="liv-label">Başlık</label>
                                    <input className="liv-input" value={title} placeholder="Otomatik" onChange={(e) => setTitle(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* Reference images */}
                        {slots.length > 0 && (
                            <div className="bg-liv-card border border-liv-border p-6 space-y-3" data-testid="reference-images">
                                <h3 className="font-display text-lg uppercase">Referans Görseller</h3>
                                <p className="text-[11px] text-neutral-400">Logo, oyuncu portresi veya takım fotoğrafı yükleyin — prompt'a referans olarak dahil edilir.</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {slots.map((slot) => {
                                        const key = slot.replace("?", "");
                                        const labels = { home_crest: "Ev Sahibi Logo", away_crest: "Deplasman Logo", team_photo: "Takım Fotoğrafı", player_photo: "Oyuncu Portresi", club_crest: "Kulüp Logosu" };
                                        return <RefImageSlot key={key} label={labels[key] || key} value={refs[key]} onChange={(v) => setRefs({ ...refs, [key]: v })} testid={key} />;
                                    })}
                                </div>
                                {teamPhotos.length > 0 && slots.includes("team_photo?") && (
                                    <div>
                                        <div className="text-[10px] uppercase tracking-widest text-neutral-400 mt-3 mb-1">Ya da kayıtlı takım fotoğraflarından seç</div>
                                        <div className="flex flex-wrap gap-2">
                                            {teamPhotos.map((tp) => (
                                                <button key={tp.id} onClick={() => setRefs({ ...refs, team_photo: tp.photo_url })}
                                                    className="w-16 h-16 border border-liv-border hover:border-liv-yellow overflow-hidden" title={tp.title}>
                                                    <img src={tp.photo_url} alt={tp.title} className="w-full h-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Marka İmzası — website + instagram — tüm 9 şablonda */}
                        <SignatureBlock templateKey={active.key} siteS={siteS} ctx={ctx} setCtxField={setCtxField} />

                        {/* Design customizer */}
                        <DesignCustomizer options={designOptions} custom={customDesign} setCustom={setCustomDesign} values={customVals} setValues={setCustomVals} />

                        <button disabled={submitting} onClick={submit} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="submit-template">
                            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Kuyruğa alınıyor…</> : <><Wand2 className="w-4 h-4" /> {variationCount} Varyasyon Üret ({variationCount} kredi)</>}
                        </button>
                    </div>

                    {/* Right: Jobs panel */}
                    <div className="bg-liv-card border border-liv-border p-6" data-testid="jobs-panel">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-display text-2xl uppercase">İşler</h3>
                            <button onClick={refreshJobs} className="text-xs text-neutral-400 hover:text-liv-yellow inline-flex items-center gap-1" data-testid="refresh-jobs"><RefreshCw className="w-3 h-3" /> Yenile</button>
                        </div>
                        {jobs.length === 0 && <div className="text-sm text-neutral-500">Henüz üretim yok.</div>}
                        <div className="space-y-3 max-h-[720px] overflow-y-auto">
                            {jobs.map((j) => (
                                <div key={j.id} className="border border-liv-border bg-liv-surface p-3" data-testid={`job-${j.id}`}>
                                    <div className="flex items-center gap-2 text-xs">
                                        <StatusIcon status={j.status} />
                                        <span className="uppercase tracking-widest text-neutral-400">{j.template_key}</span>
                                        {j.variation_index !== undefined && <span className="text-[10px] text-liv-yellow">V{(j.variation_index || 0) + 1}</span>}
                                        <span className="ml-auto text-[10px] text-neutral-500">{(j.created_at || "").slice(11, 16)}</span>
                                    </div>
                                    {j.status === "success" && j.public_url && (
                                        <div className="mt-2">
                                            <div className="relative cursor-pointer group/img" onClick={() => openJobLightbox(j)} data-testid={`job-image-${j.id}`}>
                                                <img src={mediaAbsUrl(j.public_url)} alt="" className="w-full aspect-square object-cover border border-liv-border" />
                                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                                                    <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            {j.design && (
                                                <div className="text-[9px] text-neutral-500 mt-1">
                                                    {j.design.layout} · {j.design.scene} · {j.design.typography} · drama {j.design.drama}
                                                </div>
                                            )}
                                            {j.social_caption && (
                                                <div className="text-[10px] text-neutral-400 mt-1 line-clamp-2 italic">{j.social_caption.caption}</div>
                                            )}
                                            {!j.social_caption && (
                                                <div className="text-[9px] text-neutral-500 mt-1 italic">Caption hazırlanıyor…</div>
                                            )}
                                            <div className="flex items-center justify-between mt-2 gap-2">
                                                <a href={mediaAbsUrl(j.public_url)} download className="text-xs text-liv-yellow hover:underline inline-flex items-center gap-1"><Download className="w-3 h-3" /> İndir</a>
                                                <button onClick={() => togglePublish(j)} data-testid={`gallery-toggle-${j.id}`}
                                                    className={`text-[10px] uppercase tracking-widest px-2 py-1 border inline-flex items-center gap-1 ${j.published_to_gallery ? "bg-liv-yellow text-black border-liv-yellow" : "border-liv-border text-neutral-300 hover:border-liv-yellow"}`}>
                                                    <Star className="w-3 h-3" /> {j.published_to_gallery ? "Galeride" : "Galeriye Ekle"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {j.status === "error" && (
                                        <div className="mt-1">
                                            <div className="text-xs text-red-400 line-clamp-3">{j.error}</div>
                                            {j.refunded && <div className="text-[10px] text-green-400 mt-1">✓ 1 kredi iade edildi</div>}
                                        </div>
                                    )}
                                    {j.status === "processing" && <div className="text-xs text-neutral-400 mt-1">DR AI Image 2 çalışıyor (~20-60sn)…</div>}
                                    {j.status === "pending" && <div className="text-xs text-neutral-500 mt-1">Kuyrukta</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                </>
            )}
            <Lightbox open={lbOpen} items={lbItems} activeIndex={lbIdx} onClose={() => setLbOpen(false)} onIndex={setLbIdx} />
        </div>
    );
};
export default AiStudio;
