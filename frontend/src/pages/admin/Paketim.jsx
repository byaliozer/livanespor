import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { toast } from "sonner";
import { Crown, Sparkles, Zap, TrendingUp, Plus, Minus, Loader2 } from "lucide-react";

const PLANS = [
    { key: "starter", name: "Starter", credits: 30, icon: Zap, desc: "Yeni başlayan kulüpler için." },
    { key: "plus", name: "Plus", credits: 100, icon: Sparkles, desc: "Aktif sosyal medya için.", popular: true },
    { key: "pro", name: "Pro", credits: 500, icon: Crown, desc: "Profesyonel kulüpler için." },
];

const TX_LABEL = {
    usage: "Kullanım",
    monthly_reset: "Aylık Yenileme",
    plan_change: "Paket Değişimi",
    manual_adjust: "Manuel",
};

const Paketim = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [adjust, setAdjust] = useState(10);

    const load = async () => {
        setLoading(true);
        try {
            const d = await adminApi.subscription();
            setData(d);
        } catch (e) {
            toast.error("Paket bilgisi alınamadı");
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const changePlan = async (plan_name) => {
        if (!window.confirm(`${plan_name.toUpperCase()} paketine geçmek istediğinizden emin misiniz? Mevcut krediler sıfırlanıp aylık limit yeniden başlatılacak.`)) return;
        setBusy(true);
        try {
            const d = await adminApi.setPlan(plan_name);
            setData(d);
            toast.success(`Paket güncellendi: ${d.plan_display_name}`);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Paket değiştirilemedi");
        } finally { setBusy(false); }
    };

    const doAdjust = async (direction) => {
        const amt = direction * Math.abs(parseInt(adjust || 0, 10));
        if (!amt) return;
        setBusy(true);
        try {
            await adminApi.adjustCredits(amt, direction > 0 ? "Elle kredi eklendi" : "Elle kredi düşüldü");
            toast.success("Kredi güncellendi");
            await load();
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Güncellenemedi");
        } finally { setBusy(false); }
    };

    if (loading || !data) return <div className="text-neutral-400" data-testid="paketim-loading">Yükleniyor…</div>;

    const used = Math.max(0, (data.monthly_credit_limit || 0) - (data.credit_balance || 0));
    const pct = data.monthly_credit_limit ? Math.min(100, Math.round((used / data.monthly_credit_limit) * 100)) : 0;

    return (
        <div className="space-y-8" data-testid="paketim-page">
            <div>
                <div className="overline">Abonelik</div>
                <h1 className="font-display text-5xl md:text-6xl uppercase mt-1">Paketim</h1>
                <p className="text-sm text-neutral-400 mt-2">AI medya üretimi için aylık kredi paketiniz ve kullanım geçmişiniz.</p>
            </div>

            {/* Current plan card */}
            <div className="bg-liv-card border border-liv-border p-6 md:p-8" data-testid="paketim-current-plan">
                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <div className="overline">Aktif Paket</div>
                        <div className="font-display text-5xl uppercase text-liv-yellow mt-1" data-testid="paketim-plan-name">{data.plan_display_name}</div>
                        <div className="text-xs text-neutral-500 mt-2">Son yenileme: {data.last_reset_year_month}</div>
                    </div>
                    <div>
                        <div className="overline">Kalan Kredi</div>
                        <div className="font-display text-5xl mt-1" data-testid="paketim-credit-balance">{data.credit_balance}<span className="text-xl text-neutral-500"> / {data.monthly_credit_limit}</span></div>
                        <div className="mt-3 h-2 bg-liv-black border border-liv-border overflow-hidden">
                            <div className="h-full bg-liv-yellow" style={{ width: `${100 - pct}%` }} />
                        </div>
                        <div className="text-xs text-neutral-500 mt-2">Bu ay {used} kredi kullanıldı ({pct}%)</div>
                    </div>
                    <div>
                        <div className="overline">Toplam Kullanım</div>
                        <div className="font-display text-5xl mt-1 flex items-center gap-2"><TrendingUp className="w-7 h-7 text-liv-yellow" /> {data.total_used_all_time || 0}</div>
                        <div className="text-xs text-neutral-500 mt-2">Tüm zamanların toplam üretimi</div>
                    </div>
                </div>
            </div>

            {/* Plan selection */}
            <div>
                <h2 className="font-display text-2xl uppercase mb-4">Paket Değiştir</h2>
                <div className="grid md:grid-cols-3 gap-4">
                    {PLANS.map((p) => {
                        const Icon = p.icon;
                        const active = data.plan_name === p.key;
                        return (
                            <button
                                key={p.key}
                                disabled={busy || active}
                                onClick={() => changePlan(p.key)}
                                data-testid={`plan-card-${p.key}`}
                                className={`relative text-left p-6 border transition-colors ${active ? "border-liv-yellow bg-liv-yellow/10" : "border-liv-border bg-liv-card hover:border-liv-yellow"} disabled:opacity-60`}
                            >
                                {p.popular && !active && (
                                    <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-widest bg-liv-yellow text-black px-2 py-0.5">Popüler</span>
                                )}
                                {active && (
                                    <span className="absolute -top-2 right-3 text-[10px] uppercase tracking-widest bg-green-500 text-black px-2 py-0.5">Aktif</span>
                                )}
                                <Icon className="w-6 h-6 text-liv-yellow" />
                                <div className="font-display text-3xl uppercase mt-3">{p.name}</div>
                                <div className="text-2xl font-bold text-white mt-2">{p.credits} <span className="text-sm text-neutral-400">kredi/ay</span></div>
                                <div className="text-xs text-neutral-500 mt-3">{p.desc}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Manual adjust (super_admin only — backend enforces) */}
            <div className="bg-liv-card border border-liv-border p-6">
                <h2 className="font-display text-2xl uppercase mb-4">Manuel Kredi Ayarı</h2>
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="number"
                        min="1"
                        value={adjust}
                        onChange={(e) => setAdjust(e.target.value)}
                        className="liv-input !w-32"
                        data-testid="paketim-adjust-amount"
                    />
                    <button disabled={busy} onClick={() => doAdjust(1)} className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 !text-xs" data-testid="paketim-credit-add">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Ekle
                    </button>
                    <button disabled={busy} onClick={() => doAdjust(-1)} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 !text-xs" data-testid="paketim-credit-deduct">
                        <Minus className="w-4 h-4" /> Düş
                    </button>
                    <span className="text-xs text-neutral-500">Yalnızca süper admin kredi ayarlayabilir.</span>
                </div>
            </div>

            {/* Transactions */}
            <div className="bg-liv-card border border-liv-border p-6" data-testid="paketim-transactions">
                <h2 className="font-display text-2xl uppercase mb-4">Son İşlemler</h2>
                {(data.transactions || []).length === 0 && (
                    <div className="text-sm text-neutral-500">Henüz işlem kaydı yok.</div>
                )}
                <div className="divide-y divide-liv-border/60">
                    {(data.transactions || []).map((t, i) => (
                        <div key={i} className="py-2 flex items-center justify-between text-sm">
                            <div>
                                <div className="font-semibold">{TX_LABEL[t.type] || t.type}</div>
                                <div className="text-xs text-neutral-500">{t.note} · {t.at?.slice(0, 19).replace("T", " ")}</div>
                            </div>
                            <div className="text-right">
                                <div className={`font-display text-xl ${t.amount >= 0 ? "text-green-400" : "text-red-400"}`}>{t.amount > 0 ? "+" : ""}{t.amount}</div>
                                <div className="text-xs text-neutral-500">Bakiye: {t.balance_after}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default Paketim;
