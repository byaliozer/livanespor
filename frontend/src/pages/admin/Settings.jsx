import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ImageField } from "@/components/admin/CrudPage";
import { useAuth } from "@/contexts/AuthContext";

const THEMES = [
    { value: "dark", label: "Koyu (Dark)" },
    { value: "light", label: "Açık (Light)" },
];

const ColorInput = ({ label, value, onChange, testid }) => (
    <div>
        <label className="liv-label">{label}</label>
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => onChange(e.target.value)}
                className="w-12 h-10 bg-liv-black border border-liv-border cursor-pointer"
                data-testid={`${testid}-picker`}
            />
            <input
                type="text"
                value={value || ""}
                placeholder="#000000"
                onChange={(e) => onChange(e.target.value)}
                className="liv-input !flex-1"
                data-testid={testid}
            />
        </div>
    </div>
);

const Settings = () => {
    const { user } = useAuth();
    const isSuper = user?.role === "super_admin";
    const [s, setS] = useState({});
    const [loading, setLoading] = useState(true);
    // AI Settings (super-admin only)
    const [aiS, setAiS] = useState(null);
    const [apiKey, setApiKey] = useState("");
    const [keyEditing, setKeyEditing] = useState(false);

    useEffect(() => {
        adminApi.settings().then((d) => { setS(d || {}); setLoading(false); });
        if (isSuper) {
            adminApi.aiSettings().then(setAiS).catch(() => setAiS(null));
        }
    }, [isSuper]);

    const update = (k, v) => setS({ ...s, [k]: v });
    const updateSocial = (k, v) => setS({ ...s, social: { ...(s.social || {}), [k]: v } });
    const save = async () => {
        try {
            await adminApi.saveSettings(s);
            toast.success("Kaydedildi");
        } catch (e) { toast.error("Kaydedilemedi"); }
    };

    const saveAiKey = async () => {
        try {
            await adminApi.saveAiSettings({ openai_api_key: apiKey, enabled: true });
            toast.success("DR AI Image 2 API anahtarı kaydedildi");
            setKeyEditing(false); setApiKey("");
            adminApi.aiSettings().then(setAiS);
        } catch (e) {
            toast.error("Kaydedilemedi: " + (e?.response?.data?.detail || e.message));
        }
    };
    if (loading) return <div className="text-neutral-400">Yükleniyor…</div>;
    return (
        <div className="space-y-6" data-testid="admin-settings">
            <div>
                <div className="overline">Sistem</div>
                <h1 className="font-display text-5xl uppercase mt-1">Site Ayarları</h1>
            </div>

            {/* Kulüp Kimliği */}
            <div className="bg-liv-card border border-liv-border p-6">
                <h2 className="font-display text-2xl uppercase mb-4">Kulüp Kimliği</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className="liv-label">Site Başlığı</label><input value={s.site_title || ""} onChange={(e) => update("site_title", e.target.value)} className="liv-input" data-testid="settings-site-title" /></div>
                    <div><label className="liv-label">Kısa Ad (ör. LIV)</label><input value={s.short_name || ""} onChange={(e) => update("short_name", e.target.value)} className="liv-input" data-testid="settings-short-name" placeholder="LIV" /></div>
                    <div><label className="liv-label">Sezon</label><input value={s.season || ""} onChange={(e) => update("season", e.target.value)} className="liv-input" data-testid="settings-season" /></div>
                    <div className="md:col-span-2"><label className="liv-label">Site Açıklaması</label><textarea rows={2} value={s.site_description || ""} onChange={(e) => update("site_description", e.target.value)} className="liv-input" data-testid="settings-site-description" /></div>
                    <div className="md:col-span-2">
                        <label className="liv-label">Logo</label>
                        <ImageField value={s.logo_url} onChange={(v) => update("logo_url", v)} testid="settings-logo-url" purpose="logo" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="liv-label">Favicon</label>
                        <ImageField value={s.favicon_url} onChange={(v) => update("favicon_url", v)} testid="settings-favicon-url" purpose="favicon" />
                    </div>
                </div>
            </div>

            {/* Tema & Renkler */}
            <div className="bg-liv-card border border-liv-border p-6">
                <h2 className="font-display text-2xl uppercase mb-4">Tema & Renkler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorInput label="Birincil Renk (Primary)" value={s.primary_color} onChange={(v) => update("primary_color", v)} testid="settings-primary-color" />
                    <ColorInput label="İkincil Renk (Secondary)" value={s.secondary_color} onChange={(v) => update("secondary_color", v)} testid="settings-secondary-color" />
                    <ColorInput label="Arkaplan (Background)" value={s.bg_color} onChange={(v) => update("bg_color", v)} testid="settings-bg-color" />
                    <div>
                        <label className="liv-label">Varsayılan Tema</label>
                        <select value={s.default_theme || "dark"} onChange={(e) => update("default_theme", e.target.value)} className="liv-input" data-testid="settings-default-theme">
                            {THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                    <span className="text-xs text-neutral-500">Önizleme:</span>
                    <span className="w-8 h-8 border border-liv-border" style={{ background: s.primary_color || "#f5dc4c" }} />
                    <span className="w-8 h-8 border border-liv-border" style={{ background: s.secondary_color || "#000000" }} />
                    <span className="w-8 h-8 border border-liv-border" style={{ background: s.bg_color || "#0b0b0b" }} />
                </div>
            </div>

            {/* İletişim */}
            <div className="bg-liv-card border border-liv-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h2 className="md:col-span-2 font-display text-2xl uppercase">İletişim</h2>
                <div><label className="liv-label">Telefon</label><input value={s.phone || ""} onChange={(e) => update("phone", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">E-posta</label><input value={s.email || ""} onChange={(e) => update("email", e.target.value)} className="liv-input" /></div>
                <div className="md:col-span-2"><label className="liv-label">Adres</label><input value={s.address || ""} onChange={(e) => update("address", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Yönetici Adı</label><input value={s.manager_name || ""} onChange={(e) => update("manager_name", e.target.value)} className="liv-input" /></div>
                <div className="md:col-span-2"><label className="liv-label">Harita URL</label><input value={s.map_url || ""} onChange={(e) => update("map_url", e.target.value)} className="liv-input" /></div>
            </div>

            {/* Sosyal Medya */}
            <div className="bg-liv-card border border-liv-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <h2 className="md:col-span-2 font-display text-2xl uppercase">Sosyal Medya</h2>
                <div className="md:col-span-2"><label className="liv-label">Web Sitesi (görsellerde alt köşeye düşer)</label><input value={s.website || ""} onChange={(e) => update("website", e.target.value)} className="liv-input" placeholder="www.livanespor.org" data-testid="settings-website" />
                    <p className="text-[11px] text-neutral-500 mt-1">http:// veya https:// eklemesen de olur; AI görselinde otomatik temizlenir.</p>
                </div>
                <div><label className="liv-label">Instagram Kullanıcı Adı</label><input value={s.instagram_username || ""} onChange={(e) => update("instagram_username", e.target.value)} className="liv-input" placeholder="@livanespor" data-testid="settings-instagram-username" /></div>
                <div><label className="liv-label">Instagram Link</label><input value={s.social?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Twitter</label><input value={s.social?.twitter || ""} onChange={(e) => updateSocial("twitter", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">YouTube</label><input value={s.social?.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Facebook</label><input value={s.social?.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} className="liv-input" /></div>
            </div>

            <button onClick={save} className="btn-primary inline-flex items-center gap-2" data-testid="settings-save"><Save className="w-4 h-4" /> Kaydet</button>

            {/* AI Ayarları — Sadece Süper Admin */}
            {isSuper && (
                <div className="bg-liv-card border border-liv-yellow/40 p-6" data-testid="settings-ai-section">
                    <h2 className="font-display text-2xl uppercase mb-1 flex items-center gap-2"><KeyRound className="w-5 h-5 text-liv-yellow" /> DR AI Image 2 Ayarları</h2>
                    <p className="text-xs text-neutral-500 mb-4">Bu bölümü yalnızca Süper Admin görebilir. API anahtarı güncelleme, sistemin tüm görsel üretim akışını etkiler.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="liv-label">Mevcut API Key</label>
                            <div className="font-mono text-sm bg-liv-surface border border-liv-border px-3 py-2" data-testid="settings-ai-key-masked">{aiS?.openai_api_key_masked || "—"}</div>
                        </div>
                        <div>
                            <label className="liv-label">Durum</label>
                            <div className="font-semibold py-2 text-sm">
                                {aiS?.enabled !== false ? <span className="text-liv-yellow">Aktif</span> : <span className="text-red-400">Devre dışı</span>}
                            </div>
                        </div>
                    </div>
                    {!keyEditing ? (
                        <button onClick={() => setKeyEditing(true)} className="btn-secondary !py-2 !px-4 !text-xs mt-3" data-testid="settings-ai-key-edit">API Anahtarını Değiştir</button>
                    ) : (
                        <div className="mt-3">
                            <label className="liv-label">Yeni OpenAI API Anahtarı</label>
                            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="liv-input" data-testid="settings-ai-key-input" />
                            <div className="flex gap-2 mt-3">
                                <button onClick={saveAiKey} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="settings-ai-key-save"><Save className="w-4 h-4" /> Kaydet</button>
                                <button onClick={() => { setKeyEditing(false); setApiKey(""); }} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
export default Settings;
