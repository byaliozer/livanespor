import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, X, Save, Trash2, FileText, AlertCircle, Wallet } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_TYPES = [
    "Bonservis", "Sezonluk Anlaşma Taksiti", "Aylık Maaş", "Maç Başı Prim",
    "Galibiyet Primi", "Imza Parası", "Bonus", "Diğer",
];
const CONTRACT_TYPES = [
    { value: "transfer", label: "Transfer (Bonservis)" },
    { value: "season", label: "Sezonluk Anlaşma" },
    { value: "loan", label: "Kiralık" },
    { value: "amateur", label: "Amatör (ücretsiz)" },
];

const fmtTL = (n) => `₺${(Number(n) || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;
const todayISO = () => new Date().toISOString().slice(0, 10);

const Contracts = () => {
    const [players, setPlayers] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [payments, setPayments] = useState([]);
    const [activePlayerId, setActivePlayerId] = useState("");
    const [editingContract, setEditingContract] = useState(null);
    const [editingPayment, setEditingPayment] = useState(null);
    const [summary, setSummary] = useState(null);

    const load = async () => {
        const [pl, ct, py] = await Promise.all([
            api.get("/admin/players").then((r) => r.data),
            api.get("/admin/player_contracts").then((r) => r.data),
            api.get("/admin/player_payments").then((r) => r.data),
        ]);
        const active = (pl || []).filter((p) => p.active !== false);
        setPlayers(active);
        setContracts(ct || []);
        setPayments(py || []);
        if (!activePlayerId && active[0]) setActivePlayerId(active[0].id);
    };
    useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

    useEffect(() => {
        if (!activePlayerId) return;
        api.get(`/admin/players/${activePlayerId}/financial-summary`).then((r) => setSummary(r.data));
    }, [activePlayerId, contracts, payments]);

    const saveContract = async () => {
        try {
            const payload = { ...editingContract, total_amount: Number(editingContract.total_amount) || 0 };
            if (editingContract.id) await api.put(`/admin/player_contracts/${editingContract.id}`, payload);
            else await api.post("/admin/player_contracts", payload);
            toast.success("Sözleşme kaydedildi");
            setEditingContract(null); load();
        } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
    };
    const savePayment = async () => {
        try {
            const payload = { ...editingPayment, amount: Number(editingPayment.amount) || 0 };
            if (editingPayment.id) await api.put(`/admin/player_payments/${editingPayment.id}`, payload);
            else await api.post("/admin/player_payments", payload);
            toast.success("Ödeme kaydedildi");
            setEditingPayment(null); load();
        } catch (e) { toast.error(e?.response?.data?.detail || e.message); }
    };
    const removeContract = async (id) => {
        if (!confirm("Sözleşme silinsin mi?")) return;
        await api.delete(`/admin/player_contracts/${id}`); toast.success("Silindi"); load();
    };
    const removePayment = async (id) => {
        if (!confirm("Ödeme silinsin mi?")) return;
        await api.delete(`/admin/player_payments/${id}`); toast.success("Silindi"); load();
    };

    const activePlayer = players.find((p) => p.id === activePlayerId);
    const expSoon = contracts.filter((c) => c.end_date && c.end_date >= todayISO() && c.end_date <= new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));

    return (
        <div className="space-y-6" data-testid="admin-contracts">
            <div>
                <div className="overline">Yönetim</div>
                <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><FileText className="w-8 h-8 text-liv-yellow" /> Sözleşmeler & Ödemeler</h1>
                <p className="text-xs text-neutral-500 mt-1">Sözleşme bitiş tarihi · transfer geçmişi · maç başı prim ve bonus ödemeleri.</p>
            </div>

            {expSoon.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-md inline-flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <strong className="text-amber-300">{expSoon.length} sözleşme</strong> önümüzdeki 90 gün içinde bitiyor:
                        <ul className="text-xs text-amber-200/80 mt-1">
                            {expSoon.map((c) => {
                                const p = players.find((x) => x.id === c.player_id);
                                return <li key={c.id}>· {p?.name || c.player_id} — {c.end_date}</li>;
                            })}
                        </ul>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <aside className="lg:col-span-1 bg-liv-card border border-liv-border rounded-md max-h-[600px] overflow-y-auto" data-testid="contracts-player-list">
                    <div className="p-3 border-b border-liv-border text-xs uppercase tracking-widest text-neutral-500">Oyuncular ({players.length})</div>
                    {players.map((p) => {
                        const pc = contracts.filter((c) => c.player_id === p.id);
                        const active = pc.find((c) => !c.end_date || c.end_date >= todayISO());
                        return (
                            <button key={p.id} onClick={() => setActivePlayerId(p.id)} className={`w-full text-left px-3 py-2.5 border-l-2 flex items-center gap-2 ${activePlayerId === p.id ? "bg-liv-surface border-liv-yellow" : "border-transparent hover:bg-liv-surface/50"}`} data-testid={`contracts-player-${p.id}`}>
                                <div className="w-8 h-8 bg-liv-black border border-liv-border rounded-full overflow-hidden flex-shrink-0">
                                    {p.photo_url ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" /> : <div className="text-xs text-liv-yellow font-bold flex items-center justify-center h-full">{p.jersey_number || "?"}</div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm truncate">{p.name}</div>
                                    <div className="text-[10px] text-neutral-500">{active ? `Aktif sözleşme · ${active.end_date || "süresiz"}` : "Sözleşme yok"}</div>
                                </div>
                            </button>
                        );
                    })}
                </aside>

                <div className="lg:col-span-3 space-y-4">
                    {!activePlayer && <div className="bg-liv-card border border-liv-border p-6 text-neutral-500">Soldan bir oyuncu seçin.</div>}
                    {activePlayer && summary && (
                        <>
                            <div className="bg-liv-card border border-liv-border p-5 rounded-md flex items-center gap-4">
                                {activePlayer.photo_url && <img src={activePlayer.photo_url} alt={activePlayer.name} className="w-16 h-16 object-cover rounded-full border border-liv-border" />}
                                <div className="flex-1">
                                    <div className="font-display text-3xl">{activePlayer.name}</div>
                                    <div className="text-xs text-neutral-500">#{activePlayer.jersey_number || "—"} · {activePlayer.position}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] uppercase tracking-widest text-neutral-500">Sözleşme</div>
                                    <div className="font-display text-2xl text-liv-yellow">{fmtTL(summary.contracted_amount)}</div>
                                    <div className="text-xs text-neutral-400 mt-1">Ödenen: <span className="text-emerald-400">{fmtTL(summary.total_paid)}</span></div>
                                    {summary.remaining > 0 && <div className="text-xs text-amber-400">Kalan: {fmtTL(summary.remaining)}</div>}
                                </div>
                            </div>

                            {/* Contracts */}
                            <div className="bg-liv-card border border-liv-border rounded-md">
                                <div className="p-3 border-b border-liv-border flex items-center justify-between">
                                    <div className="font-display text-lg uppercase">Sözleşmeler</div>
                                    <button onClick={() => setEditingContract({ player_id: activePlayerId, contract_type: "season", start_date: todayISO(), total_amount: "", currency: "TRY" })} className="btn-primary !py-1.5 !px-3 !text-[10px] inline-flex items-center gap-1" data-testid="contract-new-btn"><Plus className="w-3 h-3" /> Yeni Sözleşme</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-liv-surface text-[10px] uppercase tracking-widest text-neutral-500"><tr><th className="text-left px-3 py-2">Tip</th><th className="text-left py-2">Başlangıç</th><th className="text-left py-2">Bitiş</th><th className="text-left py-2">Önceki Kulüp</th><th className="text-right py-2">Tutar</th><th className="px-3 py-2"></th></tr></thead>
                                    <tbody>
                                        {summary.contracts.length === 0 && <tr><td colSpan="6" className="px-3 py-4 text-center text-neutral-500 text-xs">Sözleşme yok</td></tr>}
                                        {summary.contracts.map((c) => (
                                            <tr key={c.id} className="border-t border-liv-border/60 hover:bg-liv-surface/40 cursor-pointer" onClick={() => setEditingContract(c)}>
                                                <td className="px-3 py-2 text-xs uppercase">{CONTRACT_TYPES.find((t) => t.value === c.contract_type)?.label || c.contract_type}</td>
                                                <td className="py-2 text-xs">{c.start_date}</td>
                                                <td className="py-2 text-xs">{c.end_date || "—"}</td>
                                                <td className="py-2 text-xs text-neutral-400">{c.from_club || "—"}</td>
                                                <td className="py-2 text-right font-bold text-liv-yellow">{fmtTL(c.total_amount)}</td>
                                                <td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); removeContract(c.id); }} className="text-neutral-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Payments */}
                            <div className="bg-liv-card border border-liv-border rounded-md" data-testid="payments-section">
                                <div className="p-3 border-b border-liv-border flex items-center justify-between">
                                    <div className="font-display text-lg uppercase inline-flex items-center gap-2"><Wallet className="w-4 h-4 text-liv-yellow" /> Ödemeler</div>
                                    <button onClick={() => setEditingPayment({ player_id: activePlayerId, date: todayISO(), payment_type: PAYMENT_TYPES[0], amount: "", note: "" })} className="btn-primary !py-1.5 !px-3 !text-[10px] inline-flex items-center gap-1" data-testid="payment-new-btn"><Plus className="w-3 h-3" /> Yeni Ödeme</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-liv-surface text-[10px] uppercase tracking-widest text-neutral-500"><tr><th className="text-left px-3 py-2">Tarih</th><th className="text-left py-2">Tip (Açıklama)</th><th className="text-left py-2">Not</th><th className="text-right py-2">Tutar</th><th className="px-3 py-2"></th></tr></thead>
                                    <tbody>
                                        {summary.payments.length === 0 && <tr><td colSpan="5" className="px-3 py-4 text-center text-neutral-500 text-xs">Ödeme yok</td></tr>}
                                        {summary.payments.map((py) => (
                                            <tr key={py.id} className="border-t border-liv-border/60 hover:bg-liv-surface/40 cursor-pointer" onClick={() => setEditingPayment(py)}>
                                                <td className="px-3 py-2 text-xs">{py.date}</td>
                                                <td className="py-2 text-xs"><span className="px-2 py-0.5 bg-liv-surface border border-liv-border text-liv-yellow uppercase tracking-widest">{py.payment_type}</span></td>
                                                <td className="py-2 text-xs text-neutral-400 max-w-md truncate">{py.note || "—"}</td>
                                                <td className="py-2 text-right font-bold text-emerald-400">{fmtTL(py.amount)}</td>
                                                <td className="px-3 py-2 text-right"><button onClick={(e) => { e.stopPropagation(); removePayment(py.id); }} className="text-neutral-600 hover:text-red-400"><Trash2 className="w-3 h-3" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {summary.payments.length > 0 && (
                                    <div className="p-3 border-t border-liv-border text-[11px] text-neutral-400 flex flex-wrap gap-x-4 gap-y-1">
                                        {Object.entries(summary.by_type).map(([k, v]) => <span key={k}>{k}: <strong className="text-neutral-200">{fmtTL(v)}</strong></span>)}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Contract modal */}
            {editingContract && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingContract(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-md max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-liv-border">
                            <h2 className="font-display text-2xl uppercase">{editingContract.id ? "Sözleşme Düzenle" : "Yeni Sözleşme"}</h2>
                            <button onClick={() => setEditingContract(null)}><X /></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto">
                            <div><label className="liv-label">Tip</label>
                                <select value={editingContract.contract_type} onChange={(e) => setEditingContract({ ...editingContract, contract_type: e.target.value })} className="liv-input">
                                    {CONTRACT_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="liv-label">Başlangıç</label><input type="date" value={editingContract.start_date || ""} onChange={(e) => setEditingContract({ ...editingContract, start_date: e.target.value })} className="liv-input" /></div>
                                <div><label className="liv-label">Bitiş (opsiyonel)</label><input type="date" value={editingContract.end_date || ""} onChange={(e) => setEditingContract({ ...editingContract, end_date: e.target.value })} className="liv-input" /></div>
                            </div>
                            <div><label className="liv-label">Toplam Tutar (₺)</label><input type="number" value={editingContract.total_amount || ""} onChange={(e) => setEditingContract({ ...editingContract, total_amount: e.target.value })} className="liv-input" placeholder="örn 600000" /></div>
                            <div><label className="liv-label">Önceki Kulüp (transfer ise)</label><input type="text" value={editingContract.from_club || ""} onChange={(e) => setEditingContract({ ...editingContract, from_club: e.target.value })} className="liv-input" /></div>
                            <div><label className="liv-label">Bonus / Notlar</label><textarea rows={3} value={editingContract.notes || ""} onChange={(e) => setEditingContract({ ...editingContract, notes: e.target.value })} className="liv-input" placeholder="örn: 10 gol = 50.000 ek bonus, ligde kalırsak +30.000" /></div>
                        </div>
                        <div className="p-4 border-t border-liv-border flex justify-end gap-2">
                            <button onClick={() => setEditingContract(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={saveContract} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="contract-save"><Save className="w-4 h-4" /> Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment modal */}
            {editingPayment && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditingPayment(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-md max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-liv-border">
                            <h2 className="font-display text-2xl uppercase">{editingPayment.id ? "Ödeme Düzenle" : "Yeni Ödeme"}</h2>
                            <button onClick={() => setEditingPayment(null)}><X /></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto">
                            <div><label className="liv-label">Tarih</label><input type="date" value={editingPayment.date || ""} onChange={(e) => setEditingPayment({ ...editingPayment, date: e.target.value })} className="liv-input" /></div>
                            <div><label className="liv-label">Ödeme Açıklaması</label>
                                <select value={editingPayment.payment_type} onChange={(e) => setEditingPayment({ ...editingPayment, payment_type: e.target.value })} className="liv-input" data-testid="payment-type">
                                    {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div><label className="liv-label">Tutar (₺)</label><input type="number" min="0" step="0.01" value={editingPayment.amount || ""} onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })} className="liv-input" data-testid="payment-amount" /></div>
                            <div><label className="liv-label">Not (opsiyonel)</label><input type="text" value={editingPayment.note || ""} onChange={(e) => setEditingPayment({ ...editingPayment, note: e.target.value })} className="liv-input" placeholder="örn: 25 Şubat Mudanyaspor maçı sonrası" /></div>
                        </div>
                        <div className="p-4 border-t border-liv-border flex justify-end gap-2">
                            <button onClick={() => setEditingPayment(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={savePayment} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="payment-save"><Save className="w-4 h-4" /> Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Contracts;
