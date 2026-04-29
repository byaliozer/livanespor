import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { RefreshCw, ExternalLink, CheckCircle2, AlertTriangle, Save, FlaskConical, Loader2 } from "lucide-react";

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
            <div>
                <div className="flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-liv-yellow" />
                    <h1 className="font-display text-3xl md:text-4xl uppercase">Mackolik Senkronizasyon</h1>
                </div>
                <p className="text-neutral-400 mt-2 text-sm md:text-base">
                    Puan durumu, fikstür ve kadro istatistiklerini Mackolik'ten otomatik yenileyin. Tek bir tıkla, sezon süresince güncel kalın.
                </p>
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

            {/* Help */}
            <section className="bg-liv-surface border border-liv-border p-6 text-sm text-neutral-400 space-y-2">
                <h3 className="text-neutral-200 font-semibold mb-2">Mackolik takım ID nasıl alınır?</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li>mackolik.com'a girip takımınızı arayın.</li>
                    <li>Takım sayfasındaki URL'i kopyalayın. Örnek: <code className="text-liv-yellow">mackolik.com/takim/livanespor/puan-durumu/<b>macko17560237919669206821</b></code></li>
                    <li>URL'in sonundaki <b>macko...</b> ile başlayan kısmı yukarıdaki "Mackolik Takım ID" alanına yapıştırın.</li>
                    <li>Takım Adı'na Mackolik'teki yazılışla aynı şekilde girin (örn. "Livanespor", "Elbeyli Üzüm").</li>
                    <li>"Bağlantı Testi" ile doğrulayın, sonra "Verileri Yenile" deyin.</li>
                </ol>
            </section>
        </div>
    );
};

export default MackolikSync;
