import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, X, Save, Trash2, DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const INCOME_CATEGORIES = ["Sponsorluk", "Akademi Aidatı", "Forma Satışı", "Bilet", "Bağış", "Diğer Gelir"];
const EXPENSE_CATEGORIES = ["Maaş", "Saha Kirası", "Hakem Ücreti", "Yakıt", "Malzeme", "Yemek", "Sağlık", "Diğer Gider"];

const fmtTL = (n) => `₺${(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 0 })}`;

const Finance = () => {
    const [list, setList] = useState([]);
    const [summary, setSummary] = useState(null);
    const [editing, setEditing] = useState(null);
    const [filter, setFilter] = useState("all"); // all | income | expense | unpaid

    const load = async () => {
        const [rows, s] = await Promise.all([
            api.get("/admin/finance_transactions").then((r) => r.data),
            api.get("/admin/finance/summary").then((r) => r.data),
        ]);
        setList([...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "")));
        setSummary(s);
    };
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            const payload = { ...editing, amount: Number(editing.amount) || 0 };
            if (editing.id) {
                await api.put(`/admin/finance_transactions/${editing.id}`, payload);
            } else {
                await api.post("/admin/finance_transactions", payload);
            }
            toast.success("Kaydedildi");
            setEditing(null); load();
        } catch (e) { toast.error("Hata: " + (e?.response?.data?.detail || e.message)); }
    };
    const remove = async (id) => {
        if (!confirm("Silinsin mi?")) return;
        await api.delete(`/admin/finance_transactions/${id}`);
        toast.success("Silindi"); load();
    };

    const filtered = list.filter((r) => {
        if (filter === "all") return true;
        if (filter === "unpaid") return r.paid === false;
        return r.type === filter;
    });

    return (
        <div className="space-y-6" data-testid="admin-finance">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Yönetim</div>
                    <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><DollarSign className="w-8 h-8 text-liv-yellow" /> Mali Modül (Kasa)</h1>
                    <p className="text-xs text-neutral-500 mt-1">Aylık gelir/gider takibi · sponsor tahsilat durumu · kara tahta mantığında.</p>
                </div>
                <button onClick={() => setEditing({ type: "expense", date: new Date().toISOString().slice(0, 10), category: EXPENSE_CATEGORIES[0], amount: "", description: "", paid: true })} className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2" data-testid="finance-new-btn"><Plus className="w-4 h-4" /> Yeni Kayıt</button>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-liv-card border border-liv-border p-5 rounded-md" data-testid="finance-this-month">
                        <div className="text-xs uppercase tracking-widest text-neutral-400 mb-1">Bu Ay Net</div>
                        <div className={`font-display text-4xl ${summary.this_month.net >= 0 ? "text-liv-yellow" : "text-red-400"}`}>{fmtTL(summary.this_month.net)}</div>
                        <div className="mt-2 flex gap-3 text-xs">
                            <span className="text-emerald-400">+{fmtTL(summary.this_month.income)}</span>
                            <span className="text-red-400">−{fmtTL(summary.this_month.expense)}</span>
                        </div>
                        <div className="mt-3 text-[11px] text-neutral-500">Geçen ay net: <span className={summary.last_month_net >= 0 ? "text-neutral-300" : "text-red-400"}>{fmtTL(summary.last_month_net)}</span></div>
                    </div>

                    <div className="bg-liv-card border border-liv-border p-5 rounded-md md:col-span-2">
                        <div className="text-xs uppercase tracking-widest text-neutral-400 mb-2">Son 6 Ay (Gelir vs Gider)</div>
                        <div className="flex items-end gap-2 h-32">
                            {summary.chart.map((m) => {
                                const max = Math.max(1, ...summary.chart.map((x) => Math.max(x.income, x.expense)));
                                return (
                                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                                        <div className="w-full flex gap-0.5 h-24 items-end" title={`${m.month}: +${m.income} / -${m.expense}`}>
                                            <div className="flex-1 bg-emerald-500/70" style={{ height: `${(m.income / max) * 100}%` }} />
                                            <div className="flex-1 bg-red-500/70" style={{ height: `${(m.expense / max) * 100}%` }} />
                                        </div>
                                        <div className="text-[9px] text-neutral-500 uppercase">{m.month.slice(5)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {summary.pending_count > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-md md:col-span-3 inline-flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div className="text-sm">
                                <strong className="text-amber-300">{summary.pending_count}</strong> tahsil edilmemiş kayıt var · Toplam beklenen gelir: <strong className="text-amber-300">{fmtTL(summary.pending_total)}</strong>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                {[["all", "Tümü"], ["income", "Gelir"], ["expense", "Gider"], ["unpaid", "Tahsil Edilmemiş"]].map(([v, l]) => (
                    <button key={v} onClick={() => setFilter(v)} className={`text-xs uppercase tracking-widest px-3 py-1.5 border ${filter === v ? "bg-liv-yellow text-black border-liv-yellow" : "border-liv-border text-neutral-400 hover:text-liv-yellow"}`} data-testid={`finance-filter-${v}`}>{l}</button>
                ))}
            </div>

            <div className="bg-liv-card border border-liv-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-liv-surface text-xs uppercase tracking-widest text-neutral-500">
                        <tr><th className="text-left px-4 py-3">Tarih</th><th className="text-left py-3">Tür</th><th className="text-left py-3">Kategori</th><th className="text-left py-3">Açıklama</th><th className="text-right py-3">Tutar</th><th className="text-center py-3">Durum</th><th className="px-4 py-3"></th></tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && <tr><td colSpan="7" className="px-4 py-8 text-center text-neutral-500">Kayıt yok</td></tr>}
                        {filtered.map((r) => (
                            <tr key={r.id} className="border-t border-liv-border/60 hover:bg-liv-surface/40 cursor-pointer" onClick={() => setEditing(r)} data-testid={`finance-row-${r.id}`}>
                                <td className="px-4 py-3 text-neutral-300">{r.date}</td>
                                <td className="py-3">{r.type === "income" ? <span className="text-emerald-400 inline-flex items-center gap-1 text-xs uppercase"><TrendingUp className="w-3.5 h-3.5" /> Gelir</span> : <span className="text-red-400 inline-flex items-center gap-1 text-xs uppercase"><TrendingDown className="w-3.5 h-3.5" /> Gider</span>}</td>
                                <td className="py-3 text-xs">{r.category}</td>
                                <td className="py-3 text-xs text-neutral-400 max-w-md truncate">{r.description}</td>
                                <td className={`py-3 text-right font-bold ${r.type === "income" ? "text-emerald-400" : "text-red-400"}`}>{r.type === "income" ? "+" : "−"}{fmtTL(r.amount)}</td>
                                <td className="py-3 text-center">{r.paid === false ? <span className="text-amber-400 text-xs">Tahsil edilmedi</span> : <span className="text-neutral-500 text-xs">✓</span>}</td>
                                <td className="px-4 py-3 text-right"><button onClick={(e) => { e.stopPropagation(); remove(r.id); }} className="text-neutral-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-md max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-liv-border">
                            <h2 className="font-display text-2xl uppercase">{editing.id ? "Kayıt Düzenle" : "Yeni Kayıt"}</h2>
                            <button onClick={() => setEditing(null)}><X /></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setEditing({ ...editing, type: "income", category: INCOME_CATEGORIES[0] })} className={`py-2 text-xs uppercase border ${editing.type === "income" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "border-liv-border text-neutral-400"}`} data-testid="finance-type-income">Gelir</button>
                                <button onClick={() => setEditing({ ...editing, type: "expense", category: EXPENSE_CATEGORIES[0] })} className={`py-2 text-xs uppercase border ${editing.type === "expense" ? "bg-red-500/20 border-red-500 text-red-300" : "border-liv-border text-neutral-400"}`} data-testid="finance-type-expense">Gider</button>
                            </div>
                            <div><label className="liv-label">Tarih</label><input type="date" value={editing.date || ""} onChange={(e) => setEditing({ ...editing, date: e.target.value })} className="liv-input" data-testid="finance-date" /></div>
                            <div><label className="liv-label">Kategori</label>
                                <select value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className="liv-input" data-testid="finance-category">
                                    {(editing.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div><label className="liv-label">Tutar (₺)</label><input type="number" min="0" step="0.01" value={editing.amount || ""} onChange={(e) => setEditing({ ...editing, amount: e.target.value })} className="liv-input" data-testid="finance-amount" /></div>
                            <div><label className="liv-label">Açıklama</label><input type="text" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="liv-input" placeholder="Örn: Mart ayı saha kirası, EVSER HALI 2. taksit" data-testid="finance-desc" /></div>
                            <label className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" checked={editing.paid !== false} onChange={(e) => setEditing({ ...editing, paid: e.target.checked })} className="accent-liv-yellow" data-testid="finance-paid" />
                                <span>Tahsil edildi / Ödendi</span>
                            </label>
                        </div>
                        <div className="p-4 border-t border-liv-border flex justify-end gap-2">
                            <button onClick={() => setEditing(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={save} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="finance-save"><Save className="w-4 h-4" /> Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Finance;
