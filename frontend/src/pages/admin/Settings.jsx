import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
    const [s, setS] = useState({});
    const [loading, setLoading] = useState(true);
    useEffect(() => { adminApi.settings().then((d) => { setS(d || {}); setLoading(false); }); }, []);
    const update = (k, v) => setS({ ...s, [k]: v });
    const updateSocial = (k, v) => setS({ ...s, social: { ...(s.social || {}), [k]: v } });
    const save = async () => {
        try {
            await adminApi.saveSettings(s);
            toast.success("Kaydedildi");
        } catch (e) { toast.error("Kaydedilemedi"); }
    };
    if (loading) return <div className="text-neutral-400">Yükleniyor…</div>;
    return (
        <div className="space-y-6" data-testid="admin-settings">
            <div>
                <div className="overline">Sistem</div>
                <h1 className="font-display text-5xl uppercase mt-1">Site Ayarları</h1>
            </div>
            <div className="bg-liv-card border border-liv-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><label className="liv-label">Site Başlığı</label><input value={s.site_title || ""} onChange={(e) => update("site_title", e.target.value)} className="liv-input" /></div>
                <div className="md:col-span-2"><label className="liv-label">Site Açıklaması</label><textarea rows={2} value={s.site_description || ""} onChange={(e) => update("site_description", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Logo URL</label><input value={s.logo_url || ""} onChange={(e) => update("logo_url", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Favicon URL</label><input value={s.favicon_url || ""} onChange={(e) => update("favicon_url", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Telefon</label><input value={s.phone || ""} onChange={(e) => update("phone", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">E-posta</label><input value={s.email || ""} onChange={(e) => update("email", e.target.value)} className="liv-input" /></div>
                <div className="md:col-span-2"><label className="liv-label">Adres</label><input value={s.address || ""} onChange={(e) => update("address", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Yönetici Adı</label><input value={s.manager_name || ""} onChange={(e) => update("manager_name", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Sezon</label><input value={s.season || ""} onChange={(e) => update("season", e.target.value)} className="liv-input" /></div>
                <div className="md:col-span-2"><label className="liv-label">Harita URL</label><input value={s.map_url || ""} onChange={(e) => update("map_url", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Instagram</label><input value={s.social?.instagram || ""} onChange={(e) => updateSocial("instagram", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Twitter</label><input value={s.social?.twitter || ""} onChange={(e) => updateSocial("twitter", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">YouTube</label><input value={s.social?.youtube || ""} onChange={(e) => updateSocial("youtube", e.target.value)} className="liv-input" /></div>
                <div><label className="liv-label">Facebook</label><input value={s.social?.facebook || ""} onChange={(e) => updateSocial("facebook", e.target.value)} className="liv-input" /></div>
            </div>
            <button onClick={save} className="btn-primary inline-flex items-center gap-2" data-testid="settings-save"><Save className="w-4 h-4" /> Kaydet</button>
        </div>
    );
};
export default Settings;
