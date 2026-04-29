import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Save, FlaskConical, Loader2, HelpCircle, Search, Copy, Globe, ArrowRight } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";

const Stat = ({ label, value, hint }) => (
    <div className="bg-liv-card border border-liv-border p-4">
        <div className="text-xs text-neutral-500 uppercase tracking-wider">{label}</div>
        <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
        {hint ? <div className="text-xs text-neutral-500 mt-1">{hint}</div> : null}
    </div>
);

const MackolikSync = () => {
    const [settings, setSettings] = useState({ macko_team_id: "", team_display_name: "", enabled: true });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [syncOptions, setSyncOptions] = useState({
        standings: true, fixtures: true, squad: true, photos: true, force_photos: false,
    });

    const loadSettings = () => {
        setLoading(true);
        adminApi.mackolikSettings()
            .then((s) => setSettings({
                macko_team_id: s.macko_team_id || "",
                team_display_name: s.team_display_name || "",
                enabled: s.enabled !== false,
                last_sync_at: s.last_sync_at,
                last_sync_status: s.last_sync_status,
                last_sync_summary: s.last_sync_summary,
                last_sync_error: s.last_sync_error,
            }))
            .finally(() => setLoading(false));
    };

    useEffect(loadSettings, []);

    const update = (k, v) => setSettings((s) => ({ ...s, [k]: v }));
    const updateOpt = (k, v) => setSyncOptions((s) => ({ ...s, [k]: v }));

    const onSave = async () => {
        if (!settings.macko_team_id || !settings.team_display_name) {
            toast.error("Mackolik takım ID ve takım adı zorunludur");
            return;
        }
        setSaving(true);
        try {
            await adminApi.saveMackolikSettings({
                macko_team_id: settings.macko_team_id.trim(),
                team_display_name: settings.team_display_name.trim(),
                enabled: settings.enabled,
            });
            toast.success("Ayarlar kaydedildi");
            loadSettings();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Kaydedilemedi");
        } finally {
            setSaving(false);
        }
    };

    const onTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const res = await adminApi.mackolikTest();
            setTestResult(res);
            toast.success(`Bağlantı başarılı — ${res.counts.standings} sıralama, ${res.counts.fixtures} maç, ${res.counts.squad} oyuncu bulundu`);
        } catch (e) {
            setTestResult({ ok: false, error: e?.response?.data?.detail || String(e) });
            toast.error(e?.response?.data?.detail || "Bağlantı başarısız");
        } finally {
            setTesting(false);
        }
    };

    const onSync = async () => {
        if (!window.confirm("Mevcut puan durumu ve fikstür silinip Mackolik'ten gelen yeni veri yazılacak. Emin misiniz?")) return;
        setSyncing(true);
        try {
            const res = await adminApi.mackolikSync(syncOptions);
            const ap = res.summary.applied;
            toast.success(
                `Yenileme tamam: ${ap.standings} sıralama, ${ap.fixtures} maç, ${ap.players_updated} oyuncu güncellendi (+${ap.players_created} yeni), ${ap.photos_updated} foto eklendi.`,
                { duration: 8000 },
            );
            loadSettings();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Yenileme başarısız");
        } finally {
            setSyncing(false);
        }
    };

    if (loading) return <div className="p-8 text-neutral-400">Yükleniyor...</div>;

    const last = settings.last_sync_summary;

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-5xl" data-testid="admin-mackolik-page">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <RefreshCw className="w-6 h-6 text-liv-yellow" />
                        <h1 className="font-display text-3xl md:text-4xl uppercase">Mackolik Senkronizasyon</h1>
                    </div>
                    <p className="text-neutral-400 mt-2 text-sm md:text-base">
                        Puan durumu, fikstür ve kadro istatistiklerini Mackolik'ten otomatik yenileyin. Tek bir tıkla, sezon süresince güncel kalın.
                    </p>
                </div>
                <HowToDialog />
            </div>

            {/* Settings */}
            <section className="bg-liv-card border border-liv-border p-6 md:p-8 space-y-5" data-testid="macko-settings">
                <h2 className="font-display text-xl uppercase tracking-wide">Takım Ayarları</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="block">
                        <span className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">Mackolik Takım ID</span>
                        <input
                            value={settings.macko_team_id}
                            onChange={(e) => update("macko_team_id", e.target.value)}
                            placeholder="örn: macko17560237919669206821"
                            className="liv-input w-full font-mono text-sm"
                            data-testid="macko-team-id-input"
                        />
                        <span className="block text-xs text-neutral-500 mt-2">
                            Mackolik takım URL'inin sonundaki kimlik. Örnek: <span className="text-neutral-300">mackolik.com/takim/<b>livanespor</b>/.../<b>macko175602...</b></span>
                        </span>
                    </label>

                    <label className="block">
                        <span className="block text-xs uppercase tracking-wider text-neutral-400 mb-2">Takım Adı (Görünen)</span>
                        <input
                            value={settings.team_display_name}
                            onChange={(e) => update("team_display_name", e.target.value)}
                            placeholder="örn: Livanespor"
                            className="liv-input w-full"
                            data-testid="macko-team-name-input"
                        />
                        <span className="block text-xs text-neutral-500 mt-2">
                            Mackolik'teki yazılışla bire bir aynı olmalı (fikstürde ev/deplasman ayırmak için kullanılıyor).
                        </span>
                    </label>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => update("enabled", e.target.checked)}
                        className="w-4 h-4 accent-liv-yellow"
                        data-testid="macko-enabled-toggle"
                    />
                    <span className="text-sm">Senkronizasyon açık</span>
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                        data-testid="macko-save-btn"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Ayarları Kaydet
                    </button>
                    <button
                        onClick={onTest}
                        disabled={testing || !settings.macko_team_id || !settings.team_display_name}
                        className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60"
                        data-testid="macko-test-btn"
                    >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                        Bağlantı Testi (DB'ye yazmaz)
                    </button>
                </div>

                {testResult && testResult.ok && (
                    <div className="border border-emerald-700/50 bg-emerald-900/20 p-4 text-sm space-y-2" data-testid="macko-test-result-success">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Bağlantı başarılı
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            <Stat label="Sıralama" value={testResult.counts.standings} />
                            <Stat label="Maç" value={testResult.counts.fixtures} />
                            <Stat label="Oyuncu" value={testResult.counts.squad} />
                        </div>
                        <div className="text-xs text-neutral-400 pt-2 space-y-1">
                            {Object.entries(testResult.urls || {}).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-2">
                                    <span className="uppercase text-neutral-500 w-20">{k}:</span>
                                    <a href={v} target="_blank" rel="noreferrer" className="text-liv-yellow hover:underline truncate inline-flex items-center gap-1">
                                        {v} <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {testResult && !testResult.ok && (
                    <div className="border border-red-700/50 bg-red-900/20 p-4 text-sm" data-testid="macko-test-result-error">
                        <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                            <AlertTriangle className="w-4 h-4" /> Bağlantı başarısız
                        </div>
                        <pre className="text-xs whitespace-pre-wrap text-neutral-300">{testResult.error}</pre>
                    </div>
                )}
            </section>

            {/* Sync action */}
            <section className="bg-liv-card border border-liv-border p-6 md:p-8 space-y-5" data-testid="macko-sync-section">
                <h2 className="font-display text-xl uppercase tracking-wide">Verileri Yenile</h2>
                <p className="text-sm text-neutral-400">
                    Aşağıdakilerden hangilerini güncellemek istediğinizi seçin. Mevcut puan durumu ve fikstür <b>silinip yeniden yazılır</b>; oyuncular isim eşleşmesiyle güncellenir, eşleşmeyen yeni oyuncular eklenir, hiçbir oyuncu silinmez.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        { k: "standings", label: "Puan Durumu", desc: "Tüm grup ve play-off tabloları" },
                        { k: "fixtures", label: "Fikstür / Maçlar", desc: "Sezonun tüm maçları (oynanan + yaklaşan)" },
                        { k: "squad", label: "Kadro & İstatistikler", desc: "Oyuncular, gol, kart, maç sayısı" },
                        { k: "photos", label: "Oyuncu Fotoğrafları", desc: "Mackolik'te foto varsa otomatik indirilir" },
                    ].map(({ k, label, desc }) => (
                        <label key={k} className="flex items-start gap-3 p-4 border border-liv-border bg-liv-surface cursor-pointer hover:border-liv-yellow/50 transition-colors">
                            <input
                                type="checkbox"
                                checked={syncOptions[k]}
                                onChange={(e) => updateOpt(k, e.target.checked)}
                                className="w-4 h-4 mt-1 accent-liv-yellow"
                                data-testid={`macko-opt-${k}`}
                            />
                            <div>
                                <div className="text-sm font-semibold">{label}</div>
                                <div className="text-xs text-neutral-500 mt-1">{desc}</div>
                            </div>
                        </label>
                    ))}
                </div>

                <label className="flex items-center gap-3 cursor-pointer text-sm">
                    <input
                        type="checkbox"
                        checked={syncOptions.force_photos}
                        onChange={(e) => updateOpt("force_photos", e.target.checked)}
                        className="w-4 h-4 accent-liv-yellow"
                        data-testid="macko-opt-force-photos"
                        disabled={!syncOptions.photos}
                    />
                    <span>Manuel yüklenmiş fotoğrafları da Mackolik'inkilerle değiştir <span className="text-neutral-500">(genelde gerekmez)</span></span>
                </label>

                <button
                    onClick={onSync}
                    disabled={syncing || !settings.macko_team_id}
                    className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3 disabled:opacity-60"
                    data-testid="macko-sync-btn"
                >
                    {syncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    {syncing ? "Yenileniyor — Mackolik'e bağlanılıyor..." : "Mackolik'ten Verileri Yenile"}
                </button>
                {syncing && <p className="text-xs text-neutral-500">Bu işlem 30 saniye - 2 dakika sürebilir (kadro fotoğrafları indirilirken).</p>}
            </section>

            {/* Last sync status */}
            <section className="bg-liv-card border border-liv-border p-6 md:p-8 space-y-4" data-testid="macko-last-sync">
                <h2 className="font-display text-xl uppercase tracking-wide">Son Senkronizasyon</h2>
                {!settings.last_sync_at ? (
                    <p className="text-sm text-neutral-500">Henüz hiç senkronizasyon yapılmadı.</p>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-sm">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-wider font-semibold ${settings.last_sync_status === "success" ? "bg-emerald-900/30 text-emerald-400 border border-emerald-700/50" : settings.last_sync_status === "error" ? "bg-red-900/30 text-red-400 border border-red-700/50" : "bg-yellow-900/30 text-yellow-400 border border-yellow-700/50"}`}>
                                {settings.last_sync_status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {settings.last_sync_status}
                            </span>
                            <span className="text-neutral-400">{new Date(settings.last_sync_at).toLocaleString("tr-TR")}</span>
                        </div>
                        {last && last.applied && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <Stat label="Sıralama" value={last.applied.standings} />
                                <Stat label="Maç" value={last.applied.fixtures} />
                                <Stat label="Oyuncu Güncel" value={last.applied.players_updated} hint={`+${last.applied.players_created} yeni`} />
                                <Stat label="Foto Eklendi" value={last.applied.photos_updated} hint={`${last.applied.photos_skipped} atlandı`} />
                                <Stat label="Tamamlandı" value={last.completed_at ? new Date(last.completed_at).toLocaleTimeString("tr-TR") : "-"} />
                            </div>
                        )}
                        {settings.last_sync_error && (
                            <div className="border border-red-700/50 bg-red-900/20 p-4 text-xs text-red-300">
                                <div className="font-semibold mb-2">Hata:</div>
                                <pre className="whitespace-pre-wrap">{settings.last_sync_error}</pre>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Help footer link */}
            <section className="bg-liv-surface border border-liv-border p-5 text-sm text-neutral-400 flex flex-col md:flex-row md:items-center justify-between gap-3" data-testid="macko-help-footer">
                <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-liv-yellow" />
                    <span>Mackolik takım ID'sini nasıl bulacağınızı bilmiyor musunuz?</span>
                </div>
                <HowToDialog variant="link" />
            </section>
        </div>
    );
};

// ─────────────────── How-To Dialog ───────────────────
const Step = ({ n, title, children }) => (
    <div className="flex gap-4">
        <div className="shrink-0 w-9 h-9 rounded-full bg-liv-yellow text-black font-display text-lg flex items-center justify-center">{n}</div>
        <div className="flex-1 pt-1">
            <h3 className="font-semibold text-neutral-100 mb-2">{title}</h3>
            <div className="text-sm text-neutral-400 space-y-2">{children}</div>
        </div>
    </div>
);

const Code = ({ children }) => (
    <code className="px-2 py-0.5 bg-black/40 border border-liv-border text-liv-yellow font-mono text-xs break-all">{children}</code>
);

const HowToDialog = ({ variant = "button" }) => {
    const copy = (txt) => {
        navigator.clipboard.writeText(txt).then(() => toast.success("Kopyalandı"));
    };
    return (
        <Dialog>
            <DialogTrigger asChild>
                {variant === "link" ? (
                    <button className="text-liv-yellow hover:underline inline-flex items-center gap-1 text-sm font-semibold" data-testid="macko-howto-link">
                        Adım adım rehberi aç <ArrowRight className="w-3 h-3" />
                    </button>
                ) : (
                    <button className="btn-secondary inline-flex items-center gap-2 self-start" data-testid="macko-howto-btn">
                        <HelpCircle className="w-4 h-4" />
                        Veriler Nasıl Çekilir?
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-liv-card border-liv-border" data-testid="macko-howto-dialog">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl md:text-3xl uppercase tracking-wide">Mackolik'ten Veri Çekme Rehberi</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Bu sistem white-label'dır — herhangi bir kulüp için çalışır. Aşağıdaki adımları takip ederek <b>kendi takımınızın</b> verilerini ekleyebilirsiniz.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-7 mt-4">
                    <Step n={1} title="Mackolik'te takımınızı bulun">
                        <p>
                            Tarayıcınızda <a href="https://www.mackolik.com" target="_blank" rel="noreferrer" className="text-liv-yellow hover:underline inline-flex items-center gap-1">mackolik.com <ExternalLink className="w-3 h-3" /></a> adresine gidin.
                        </p>
                        <p>Sağ üstteki <Search className="inline w-3 h-3" /> arama ikonuna tıklayın ve takımınızın adını yazın <span className="text-neutral-500">(örn: "Elbeyli Üzüm", "Livanespor", "Mudanyaspor")</span>.</p>
                        <p className="text-xs text-neutral-500">Çıkan sonuçlardan <b>takım sayfasına</b> tıklayın (oyuncu veya maç değil).</p>
                    </Step>

                    <Step n={2} title="Takım sayfasının URL'sini kontrol edin">
                        <p>Takım sayfasındayken tarayıcınızın adres çubuğundaki URL şuna benzer:</p>
                        <div className="bg-black/40 border border-liv-border p-3 font-mono text-xs break-all leading-relaxed">
                            https://www.mackolik.com/takim/<span className="text-emerald-400">elbeyli-üzüm</span>/maçlar/<span className="text-liv-yellow font-bold">macko17265844851864372805</span>
                        </div>
                        <p>İki önemli parça var:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li><span className="text-emerald-400">Yeşil</span> kısım = takımın URL slug'ı (önemli değil, otomatik bulunur)</li>
                            <li><span className="text-liv-yellow font-bold">Sarı</span> kısım = <b>Mackolik Takım ID</b> — bunu kopyalayacaksınız</li>
                        </ul>
                    </Step>

                    <Step n={3} title="Mackolik Takım ID'yi kopyalayın">
                        <p>URL'in <b>en sonundaki</b> "<Code>macko</Code>" ile başlayan uzun kısmı seçin ve kopyalayın. Örnekler:</p>
                        <div className="space-y-2">
                            {[
                                ["Livanespor", "macko17560237919669206821"],
                                ["Elbeyli Üzüm", "macko17265844851864372805"],
                                ["Odunlukspor", "macko17265839385076523123"],
                                ["Mudanyaspor", "3xq7lzv17zq3n4yjgc2dttbvu"],
                            ].map(([name, id]) => (
                                <div key={id} className="flex items-center justify-between gap-3 bg-liv-surface border border-liv-border px-3 py-2 text-xs">
                                    <span className="text-neutral-300 w-32 shrink-0">{name}</span>
                                    <Code>{id}</Code>
                                    <button onClick={() => copy(id)} className="text-neutral-500 hover:text-liv-yellow shrink-0" aria-label={`${name} ID kopyala`}>
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-neutral-500">Not: Bazı takımların ID'si <Code>macko...</Code> olmadan harf-rakam karışımı olabilir (örn. Mudanyaspor). Sorun değil — URL'in en sonundaki kısmı her zaman doğru ID'dir.</p>
                    </Step>

                    <Step n={4} title="Bu sayfadaki form alanlarını doldurun">
                        <div className="bg-liv-surface border border-liv-border p-4 space-y-3">
                            <div>
                                <div className="text-xs uppercase text-neutral-500 mb-1">Mackolik Takım ID</div>
                                <div className="text-neutral-200">→ Az önce kopyaladığınız ID'yi buraya yapıştırın</div>
                            </div>
                            <div>
                                <div className="text-xs uppercase text-neutral-500 mb-1">Takım Adı (Görünen)</div>
                                <div className="text-neutral-200">→ Mackolik'in <b>takım sayfasında yazıldığı şekilde aynen</b> girin</div>
                                <div className="text-xs text-neutral-500 mt-1">Doğru: <span className="text-emerald-400">"Elbeyli Üzüm"</span> · Yanlış: <span className="text-red-400">"Elbeyli Üzümspor", "elbeyli üzüm", "Elbeli Üzüm"</span></div>
                                <div className="text-xs text-neutral-500 mt-1">Bu ad, fikstürde "ev sahibi mi deplasman mı" olduğunu anlamak için kullanılır — yanlışsa skorlar ters görünür.</div>
                            </div>
                        </div>
                        <p>Sonra <span className="text-liv-yellow font-semibold">"Ayarları Kaydet"</span> butonuna basın.</p>
                    </Step>

                    <Step n={5} title='"Bağlantı Testi" ile doğrulayın (opsiyonel ama tavsiye edilir)'>
                        <p>Bu buton <b>veritabanına hiçbir şey yazmaz</b>. Sadece Mackolik'e bağlanır ve kaç sıralama / maç / oyuncu bulduğunu gösterir.</p>
                        <p>Beklediğiniz sayılar görünüyor mu?</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Sıralama 0 ise → Takım ID yanlış olabilir</li>
                            <li>Maç 0 ise → Takım bu sezon hiç maç oynamamış olabilir</li>
                            <li>Oyuncu 0 ise → Mackolik kadro sayfasında veri yok</li>
                        </ul>
                    </Step>

                    <Step n={6} title={'"Mackolik\'ten Verileri Yenile" butonuna basın'}>
                        <p>Aşağıdaki seçeneklerden hangilerini güncellemek istediğinizi seçip <span className="text-liv-yellow font-semibold">sarı butona</span> basın.</p>
                        <div className="bg-amber-900/20 border border-amber-700/50 p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2 text-amber-300 font-semibold"><AlertTriangle className="w-3 h-3" /> Önemli</div>
                            <ul className="list-disc list-inside text-neutral-300 space-y-1">
                                <li><b>Puan Durumu</b> ve <b>Fikstür</b> tamamen silinip yeniden yazılır.</li>
                                <li><b>Oyuncular</b> isim eşleşmesiyle güncellenir; eşleşmeyenler korunur, yeniler eklenir. <b>Hiçbir oyuncu silinmez.</b></li>
                                <li><b>Fotoğraflar</b> Mackolik'te varsa otomatik indirilir. Manuel yüklediğiniz fotoyu üzerine yazmaz (ayrıca işaretlemediğiniz sürece).</li>
                            </ul>
                        </div>
                        <p>İşlem 30 saniye - 2 dakika sürer. Bittiğinde "Son Senkronizasyon" bölümünde <span className="text-emerald-400 font-semibold">SUCCESS</span> görünecek.</p>
                    </Step>

                    <Step n={7} title="Hazırsınız! Site otomatik güncel">
                        <p>Public siteniz (<Code>/puan-durumu</Code>, <Code>/fikstur</Code>, <Code>/oyuncular</Code>, anasayfa mini tablo) anında yeni verilerle gösterir. CDN cache yok — taraftarlar refresh attığında en güncel halini görür.</p>
                        <p>Her hafta veya istediğiniz zaman bu sayfaya gelip <span className="text-liv-yellow font-semibold">"Verileri Yenile"</span> deyin — başka bir şey yapmanıza gerek yok.</p>
                    </Step>

                    <div className="border-t border-liv-border pt-5 mt-2">
                        <div className="flex items-start gap-3 text-sm">
                            <Globe className="w-5 h-5 text-liv-yellow shrink-0 mt-0.5" />
                            <div>
                                <div className="font-semibold text-neutral-100">White-label kullanım</div>
                                <p className="text-neutral-400 mt-1">
                                    Bu site mimarisi <b>kulüp bağımsızdır</b>. Aynı kodu farklı bir takıma sattığınızda (örn. Elbeyli Üzümspor), yeni admin sadece bu sayfada Takım ID + Adı'nı değiştirip <i>Verileri Yenile</i> der → 30 saniye içinde tüm site o takımın verisiyle dolar. Kod değişikliği veya backend müdahalesi gerekmez.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-liv-surface border border-liv-border p-4 text-xs space-y-2">
                        <div className="font-semibold text-neutral-200">Sorun mu yaşıyorsunuz?</div>
                        <ul className="list-disc list-inside text-neutral-400 space-y-1">
                            <li><b>"Bağlantı başarısız"</b> → ID veya takım adını kontrol edin. Mackolik'in takım sayfası açılıyor mu?</li>
                            <li><b>Fikstürde skorlar ters görünüyor</b> → Takım Adı Mackolik'tekiyle birebir aynı değil. Düzeltin ve tekrar yenileyin.</li>
                            <li><b>Bazı oyuncuların fotosu yok</b> → Mackolik'in elinde de yok. Admin'den manuel yüklenmeli.</li>
                            <li><b>İstatistikler hatalı</b> → Mackolik kaynağı henüz güncellenmemiş olabilir. Bir gün sonra tekrar deneyin.</li>
                        </ul>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default MackolikSync;
