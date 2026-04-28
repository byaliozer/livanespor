import { useState, useEffect } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const initial = {
    player_name: "", birth_date: "", age: "",
    parent_name: "", phone: "", email: "",
    city: "Bursa", district: "Nilüfer", address: "",
    position_preference: "", height: "", weight: "",
    previous_club: "", has_license: false,
    health_note: "", emergency_contact: "",
    note: "", age_group: "",
    kvkk_consent: false, comm_consent: false,
};

const POSITIONS = ["Kaleci", "Defans", "Orta Saha", "Forvet"];

const AcademyApplication = () => {
    const [form, setForm] = useState(initial);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(null);
    useEffect(() => { publicApi.academyGroups().then(setGroups); }, []);

    const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const submit = async (e) => {
        e.preventDefault();
        if (!form.kvkk_consent) { toast.error("KVKK onayı gerekli"); return; }
        setLoading(true);
        try {
            const res = await publicApi.apply(form);
            setDone(res.application_no);
            toast.success("Başvurunuz alındı!");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            toast.error("Başvuru gönderilemedi: " + (err?.response?.data?.detail || err.message));
        } finally { setLoading(false); }
    };

    if (done) {
        return (
            <PublicLayout>
                <div className="container-x section-pad">
                    <div className="bg-liv-yellow text-black p-10 md:p-16 text-center max-w-3xl mx-auto" data-testid="application-success">
                        <CheckCircle2 className="w-16 h-16 mx-auto" />
                        <h1 className="font-display text-5xl md:text-7xl uppercase mt-4">BAŞVURUNUZ ALINDI</h1>
                        <p className="mt-4 text-lg">Başvuru numaranız: <span className="font-mono font-bold">{done}</span></p>
                        <p className="mt-3">En kısa sürede yetkililerimiz sizinle iletişime geçecektir.</p>
                    </div>
                </div>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <SEO title="Akademi Başvuru · Livanespor" description="Livanespor Akademi başvuru formu — U8 - U17." />
            <div className="container-x section-pad">
                <div className="overline">Akademi</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Başvuru Formu</h1>
                <p className="mt-4 max-w-2xl text-neutral-300">Aşağıdaki formu eksiksiz doldurarak Livanespor Akademi'ye başvurabilirsiniz. Bilgileriniz tarafımıza ulaştıktan sonra en kısa sürede iletişime geçilecektir.</p>

                <form onSubmit={submit} className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 bg-liv-card border border-liv-border p-6 md:p-10" data-testid="application-form">
                    <h2 className="font-display text-3xl uppercase md:col-span-2 border-b border-liv-border pb-3">Oyuncu Bilgileri</h2>
                    <div><label className="liv-label">Oyuncu Ad Soyad *</label><input required value={form.player_name} onChange={(e) => update("player_name", e.target.value)} className="liv-input" data-testid="app-player-name" /></div>
                    <div><label className="liv-label">Doğum Tarihi *</label><input type="date" required value={form.birth_date} onChange={(e) => { const dt = e.target.value; const age = dt ? new Date().getFullYear() - new Date(dt).getFullYear() : ""; setForm({ ...form, birth_date: dt, age }); }} className="liv-input" data-testid="app-birth-date" /></div>
                    <div><label className="liv-label">Yaş</label><input value={form.age} readOnly className="liv-input bg-neutral-900" /></div>
                    <div>
                        <label className="liv-label">Yaş Grubu (önerilen)</label>
                        <select value={form.age_group} onChange={(e) => update("age_group", e.target.value)} className="liv-input">
                            <option value="">Seçiniz</option>
                            {groups.map((g) => <option key={g.id} value={g.name}>{g.name} ({g.age_range})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="liv-label">Tercih Edilen Mevki</label>
                        <select value={form.position_preference} onChange={(e) => update("position_preference", e.target.value)} className="liv-input">
                            <option value="">Seçiniz</option>
                            {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="liv-label">Boy (cm)</label><input value={form.height} onChange={(e) => update("height", e.target.value)} className="liv-input" /></div>
                        <div><label className="liv-label">Kilo (kg)</label><input value={form.weight} onChange={(e) => update("weight", e.target.value)} className="liv-input" /></div>
                    </div>

                    <h2 className="font-display text-3xl uppercase md:col-span-2 border-b border-liv-border pb-3 mt-4">Veli Bilgileri</h2>
                    <div><label className="liv-label">Veli Ad Soyad *</label><input required value={form.parent_name} onChange={(e) => update("parent_name", e.target.value)} className="liv-input" data-testid="app-parent-name" /></div>
                    <div><label className="liv-label">Telefon *</label><input required value={form.phone} onChange={(e) => update("phone", e.target.value)} className="liv-input" data-testid="app-phone" /></div>
                    <div><label className="liv-label">E-posta *</label><input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="liv-input" data-testid="app-email" /></div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="liv-label">İl *</label><input required value={form.city} onChange={(e) => update("city", e.target.value)} className="liv-input" /></div>
                        <div><label className="liv-label">İlçe *</label><input required value={form.district} onChange={(e) => update("district", e.target.value)} className="liv-input" /></div>
                    </div>
                    <div className="md:col-span-2"><label className="liv-label">Adres</label><input value={form.address} onChange={(e) => update("address", e.target.value)} className="liv-input" /></div>

                    <h2 className="font-display text-3xl uppercase md:col-span-2 border-b border-liv-border pb-3 mt-4">Sportif Geçmiş</h2>
                    <div><label className="liv-label">Önceki Kulüp (varsa)</label><input value={form.previous_club} onChange={(e) => update("previous_club", e.target.value)} className="liv-input" /></div>
                    <div className="flex items-end gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_license} onChange={(e) => update("has_license", e.target.checked)} className="w-4 h-4 accent-liv-yellow" /> Daha önce lisanslı oynadım</label></div>

                    <h2 className="font-display text-3xl uppercase md:col-span-2 border-b border-liv-border pb-3 mt-4">Sağlık & Acil Durum</h2>
                    <div><label className="liv-label">Sağlık Notu</label><input value={form.health_note} onChange={(e) => update("health_note", e.target.value)} className="liv-input" placeholder="Yoksa boş bırakın" /></div>
                    <div><label className="liv-label">Acil İletişim</label><input value={form.emergency_contact} onChange={(e) => update("emergency_contact", e.target.value)} className="liv-input" /></div>
                    <div className="md:col-span-2"><label className="liv-label">Açıklama / Not</label><textarea rows={3} value={form.note} onChange={(e) => update("note", e.target.value)} className="liv-input" /></div>

                    <div className="md:col-span-2 space-y-3 pt-4 border-t border-liv-border">
                        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.kvkk_consent} onChange={(e) => update("kvkk_consent", e.target.checked)} className="w-4 h-4 accent-liv-yellow mt-1" data-testid="app-kvkk" /> <span>KVKK kapsamında <strong>açık rıza</strong> veriyorum, kişisel verilerim Livanespor tarafından başvuru süreci için işlenebilir.</span></label>
                        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={form.comm_consent} onChange={(e) => update("comm_consent", e.target.checked)} className="w-4 h-4 accent-liv-yellow mt-1" /> <span>Livanespor'dan tanıtım/iletişim almayı kabul ediyorum (opsiyonel).</span></label>
                    </div>

                    <div className="md:col-span-2 mt-4">
                        <button disabled={loading} type="submit" className="btn-primary w-full md:w-auto disabled:opacity-50" data-testid="app-submit">
                            {loading ? "Gönderiliyor..." : "Başvuruyu Gönder"}
                        </button>
                    </div>
                </form>
            </div>
        </PublicLayout>
    );
};
export default AcademyApplication;
