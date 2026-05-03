import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { X, Save, Search } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["new", "reviewing", "called", "trial_invited", "interviewed", "accepted", "rejected", "on_hold"];
const STATUS_LABELS = {
    new: "Yeni Başvuru", reviewing: "İnceleniyor", called: "Arandı",
    trial_invited: "Deneme Antrenmanına Davet", interviewed: "Görüşüldü",
    accepted: "Kabul Edildi", rejected: "Reddedildi", on_hold: "Beklemede",
};

const Applications = () => {
    const [list, setList] = useState([]);
    const [filter, setFilter] = useState("all");
    const [edit, setEdit] = useState(null);
    const [q, setQ] = useState("");
    const load = () => adminApi.list("academy_applications").then(setList);
    useEffect(() => { load(); }, []);
    const filtered = list
        .filter((a) => filter === "all" || a.status === filter)
        .filter((a) => !q || JSON.stringify(a).toLowerCase().includes(q.toLowerCase()));
    const save = async () => {
        await adminApi.update("academy_applications", edit.id, edit);
        toast.success("Güncellendi");
        setEdit(null); load();
    };
    return (
        <div className="space-y-6" data-testid="admin-applications">
            <div>
                <div className="overline">Akademi</div>
                <h1 className="font-display text-5xl uppercase mt-1">Başvurular</h1>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => setFilter("all")} className={`px-3 py-2 text-xs uppercase tracking-wider border ${filter === "all" ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300"}`}>Tümü ({list.length})</button>
                {STATUSES.map((s) => {
                    const c = list.filter((a) => a.status === s).length;
                    return <button key={s} onClick={() => setFilter(s)} className={`px-3 py-2 text-xs uppercase tracking-wider border ${filter === s ? "border-liv-yellow bg-liv-yellow text-black font-bold" : "border-liv-border text-neutral-300"}`}>{STATUS_LABELS[s]} ({c})</button>;
                })}
                <div className="relative ml-auto"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="liv-input pl-10 w-64" /></div>
            </div>
            <div className="bg-liv-card border border-liv-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-liv-surface text-xs uppercase tracking-widest text-neutral-500">
                        <tr>
                            <th className="text-left px-4 py-3">No</th><th className="text-left py-3">Oyuncu</th>
                            <th className="text-left py-3">Yaş</th><th className="text-left py-3">Veli</th>
                            <th className="text-left py-3">Telefon</th><th className="text-left py-3">Tarih</th>
                            <th className="text-left py-3">Durum</th><th className="text-right px-4 py-3">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((a) => (
                            <tr key={a.id} className="border-t border-liv-border/60 hover:bg-liv-surface/60">
                                <td className="px-4 py-3 font-mono text-xs">{a.application_no}</td>
                                <td className="py-3 font-semibold">{a.player_name}</td>
                                <td className="py-3">{a.age || a.age_group}</td>
                                <td className="py-3">{a.parent_name}</td>
                                <td className="py-3">{a.phone}</td>
                                <td className="py-3 text-xs">{a.created_at && new Date(a.created_at).toLocaleDateString("tr-TR")}</td>
                                <td className="py-3"><span className="text-xs uppercase tracking-widest text-liv-yellow">{STATUS_LABELS[a.status] || a.status}</span></td>
                                <td className="px-4 py-3 text-right"><button onClick={() => setEdit(a)} className="text-liv-yellow hover:underline text-sm">Detay</button></td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-neutral-500">Başvuru yok.</td></tr>}
                    </tbody>
                </table>
            </div>

            {edit && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4" onClick={(e) => { if (e.target === e.currentTarget) setEdit(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-2xl max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-5 border-b border-liv-border flex-shrink-0">
                            <div>
                                <h2 className="font-display text-2xl uppercase">{edit.player_name}</h2>
                                <div className="text-xs text-neutral-400 font-mono">{edit.application_no}</div>
                            </div>
                            <button onClick={() => setEdit(null)} className="text-neutral-400 hover:text-white"><X /></button>
                        </div>
                        <div className="p-4 md:p-5 space-y-4 text-sm overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div><div className="text-xs text-neutral-500">Yaş</div><div className="font-semibold">{edit.age || "-"}</div></div>
                                <div><div className="text-xs text-neutral-500">Yaş Grubu</div><div className="font-semibold">{edit.age_group || "-"}</div></div>
                                <div><div className="text-xs text-neutral-500">Veli</div><div className="font-semibold">{edit.parent_name}</div></div>
                                <div><div className="text-xs text-neutral-500">Telefon</div><div className="font-semibold">{edit.phone}</div></div>
                                <div><div className="text-xs text-neutral-500">E-posta</div><div className="font-semibold">{edit.email}</div></div>
                                <div><div className="text-xs text-neutral-500">Mevki</div><div className="font-semibold">{edit.position_preference || "-"}</div></div>
                                <div><div className="text-xs text-neutral-500">İl/İlçe</div><div className="font-semibold">{edit.city} / {edit.district}</div></div>
                                <div><div className="text-xs text-neutral-500">Önceki Kulüp</div><div className="font-semibold">{edit.previous_club || "-"}</div></div>
                            </div>
                            <div><div className="text-xs text-neutral-500">Sağlık Notu</div><div>{edit.health_note || "-"}</div></div>
                            <div><div className="text-xs text-neutral-500">Acil İletişim</div><div>{edit.emergency_contact || "-"}</div></div>
                            <div><div className="text-xs text-neutral-500">Not</div><div>{edit.note || "-"}</div></div>
                            <div className="border-t border-liv-border pt-4">
                                <label className="liv-label">Durum</label>
                                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="liv-input">
                                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="liv-label">İç Yorum / Not</label>
                                <textarea rows={3} value={edit.internal_note || ""} onChange={(e) => setEdit({ ...edit, internal_note: e.target.value })} className="liv-input" />
                            </div>
                            <div>
                                <label className="liv-label">Sorumlu Kişi</label>
                                <input value={edit.assigned_to || ""} onChange={(e) => setEdit({ ...edit, assigned_to: e.target.value })} className="liv-input" />
                            </div>
                        </div>
                        <div className="p-4 md:p-5 border-t border-liv-border flex justify-end gap-3 flex-shrink-0 bg-liv-card">
                            <button onClick={() => setEdit(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">Kapat</button>
                            <button onClick={save} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2"><Save className="w-4 h-4" /> Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Applications;
