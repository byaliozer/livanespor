import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { Save, ClipboardList, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Group → which players belong (filter rule)
// A Takım: all senior players. Altyapı (U17/U15/etc): players whose age <= group cutoff.
const GROUP_AGE_MAX = { U13: 13, U14: 14, U15: 15, U17: 17, U19: 19 };

const filterPlayersForGroup = (players, group) => {
    if (group === "A Takım") return players;
    const cutoff = GROUP_AGE_MAX[group];
    if (!cutoff) return players;
    return players.filter((p) => {
        const age = p.age || (p.birth_year ? new Date().getFullYear() - p.birth_year : null);
        return age == null || age <= cutoff;
    });
};

const Attendance = () => {
    const [trainings, setTrainings] = useState([]);
    const [allPlayers, setAllPlayers] = useState([]);
    const [activeId, setActiveId] = useState("");
    const [entries, setEntries] = useState({});  // player_id → {status, reason}
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        Promise.all([
            api.get("/admin/team_trainings").then((r) => r.data),
            api.get("/admin/players").then((r) => r.data),
        ]).then(([trs, pls]) => {
            const sorted = [...trs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
            setTrainings(sorted);
            setAllPlayers((pls || []).filter((p) => p.active !== false));
            if (sorted[0]) setActiveId(sorted[0].id);
            setLoading(false);
        }).catch((e) => { toast.error("Veri yüklenemedi: " + e.message); setLoading(false); });
    }, []);

    const activeTraining = useMemo(() => trainings.find((t) => t.id === activeId), [trainings, activeId]);
    const eligiblePlayers = useMemo(() => filterPlayersForGroup(allPlayers, activeTraining?.group_label || ""), [allPlayers, activeTraining]);

    // Load existing attendance for this training (if any)
    useEffect(() => {
        if (!activeId || eligiblePlayers.length === 0) return;
        api.get(`/admin/trainings/${activeId}/attendance`).then((r) => {
            const next = {};
            const existing = (r.data || []).reduce((acc, x) => { acc[x.player_id] = x; return acc; }, {});
            for (const p of eligiblePlayers) {
                const e = existing[p.id];
                next[p.id] = e
                    ? { status: e.status, reason: e.reason || "" }
                    : { status: "present", reason: "" };  // default GELDİ
            }
            setEntries(next);
        }).catch(() => {
            // No attendance yet → default all present
            const next = {};
            for (const p of eligiblePlayers) next[p.id] = { status: "present", reason: "" };
            setEntries(next);
        });
    }, [activeId, eligiblePlayers]);

    const setStatus = (pid, status) => {
        setEntries((prev) => ({ ...prev, [pid]: { status, reason: status === "absent" ? (prev[pid]?.reason || "") : "" } }));
    };
    const setReason = (pid, reason) => {
        setEntries((prev) => ({ ...prev, [pid]: { ...(prev[pid] || { status: "absent" }), reason } }));
    };

    const presentCount = useMemo(() => Object.values(entries).filter((e) => e.status === "present").length, [entries]);
    const absentCount = useMemo(() => Object.values(entries).filter((e) => e.status === "absent").length, [entries]);

    const save = async () => {
        // Validate: all absent must have non-empty reason
        const missingReason = Object.entries(entries).find(([, e]) => e.status === "absent" && !(e.reason || "").trim());
        if (missingReason) {
            const player = eligiblePlayers.find((p) => p.id === missingReason[0]);
            toast.error(`Gelmeyen "${player?.name || "oyuncu"}" için sebep zorunludur`);
            return;
        }
        setSaving(true);
        try {
            const payload = {
                entries: eligiblePlayers.map((p) => ({
                    player_id: p.id,
                    status: entries[p.id]?.status || "present",
                    reason: entries[p.id]?.status === "absent" ? entries[p.id]?.reason || "" : null,
                })),
            };
            await api.post(`/admin/trainings/${activeId}/attendance`, payload);
            toast.success(`Yoklama kaydedildi: ${presentCount} geldi, ${absentCount} gelmedi`);
            // Refresh trainings to update attendance_taken flag
            const r = await api.get("/admin/team_trainings");
            setTrainings([...r.data].sort((a, b) => (b.date || "").localeCompare(a.date || "")));
        } catch (e) {
            toast.error("Hata: " + (e?.response?.data?.detail || e.message));
        } finally { setSaving(false); }
    };

    if (loading) return <div className="text-neutral-400">Yükleniyor…</div>;

    if (trainings.length === 0) {
        return (
            <div className="space-y-6" data-testid="attendance-page">
                <div>
                    <div className="overline">Antrenman Yönetimi</div>
                    <h1 className="font-display text-5xl uppercase mt-1">Yoklama</h1>
                </div>
                <div className="bg-liv-card border border-liv-border p-8 text-center">
                    <ClipboardList className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
                    <p className="text-neutral-300">Henüz antrenman tanımlanmadı.</p>
                    <p className="text-xs text-neutral-500 mt-1">Önce <strong>Antrenman Takvimi</strong> sayfasından bir antrenman ekleyin.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6" data-testid="attendance-page">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Antrenman Yönetimi</div>
                    <h1 className="font-display text-5xl uppercase mt-1 inline-flex items-center gap-3"><ClipboardList className="w-8 h-8 text-liv-yellow" /> Yoklama</h1>
                    <p className="text-xs text-neutral-500 mt-1">Antrenman seç, gelmeyen oyuncuyu işaretle ve <strong>zorunlu</strong> sebep yaz.</p>
                </div>
            </div>

            <div className="bg-liv-card border border-liv-border p-6">
                <label className="liv-label">Antrenman seç</label>
                <select className="liv-input" value={activeId} onChange={(e) => setActiveId(e.target.value)} data-testid="attendance-training-select">
                    {trainings.map((t) => (
                        <option key={t.id} value={t.id}>
                            {t.date} · {t.time_range || "—"} · {t.group_label} {t.field ? `· ${t.field}` : ""} {t.attendance_taken ? "✓" : ""}
                        </option>
                    ))}
                </select>
                {activeTraining && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs">
                        {activeTraining.coach_name && <span className="text-neutral-400">Antrenör: <span className="text-neutral-200">{activeTraining.coach_name}</span></span>}
                        <span className="text-neutral-400">Toplam oyuncu: <span className="text-neutral-200">{eligiblePlayers.length}</span></span>
                        <span className="text-emerald-400">Geldi: <strong data-testid="attendance-present-count">{presentCount}</strong></span>
                        <span className="text-red-400">Gelmedi: <strong data-testid="attendance-absent-count">{absentCount}</strong></span>
                        {activeTraining.attendance_taken && <span className="text-liv-yellow">Yoklama daha önce alındı — düzenleme yapılabilir.</span>}
                    </div>
                )}
            </div>

            {eligiblePlayers.length === 0 ? (
                <div className="bg-liv-card border border-liv-border p-6 text-center text-neutral-400">Bu takım için aktif oyuncu bulunmadı.</div>
            ) : (
                <div className="bg-liv-card border border-liv-border divide-y divide-liv-border/60" data-testid="attendance-list">
                    {eligiblePlayers.map((p) => {
                        const e = entries[p.id] || { status: "present", reason: "" };
                        const isAbsent = e.status === "absent";
                        return (
                            <div key={p.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3" data-testid={`attendance-row-${p.id}`}>
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {p.photo_url ? (
                                        <img src={p.photo_url} alt={p.name} className="w-10 h-10 object-cover border border-liv-border rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 bg-liv-surface border border-liv-border rounded-full flex items-center justify-center text-xs font-bold text-liv-yellow">{p.jersey_number || "?"}</div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="font-semibold truncate">{p.name}</div>
                                        <div className="text-xs text-neutral-500">#{p.jersey_number || "—"} · {p.position || ""}</div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setStatus(p.id, "present")}
                                        className={`px-3 py-2 text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1 border ${e.status === "present" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-transparent border-liv-border text-neutral-500 hover:text-emerald-400"}`}
                                        data-testid={`attendance-present-${p.id}`}
                                    >
                                        <CheckCircle className="w-4 h-4" /> Geldi
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStatus(p.id, "absent")}
                                        className={`px-3 py-2 text-xs uppercase tracking-widest font-semibold inline-flex items-center gap-1 border ${isAbsent ? "bg-red-500/20 border-red-500 text-red-300" : "bg-transparent border-liv-border text-neutral-500 hover:text-red-400"}`}
                                        data-testid={`attendance-absent-${p.id}`}
                                    >
                                        <XCircle className="w-4 h-4" /> Gelmedi
                                    </button>
                                </div>
                                {isAbsent && (
                                    <div className="md:w-80 w-full">
                                        <input
                                            type="text"
                                            value={e.reason || ""}
                                            onChange={(ev) => setReason(p.id, ev.target.value)}
                                            placeholder="Sebep zorunlu — örn. hastalık, iş, trafik, habersiz…"
                                            className={`liv-input !py-1.5 text-xs ${!e.reason?.trim() ? "border-red-500/60" : ""}`}
                                            required
                                            data-testid={`attendance-reason-${p.id}`}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {eligiblePlayers.length > 0 && (
                <button
                    onClick={save}
                    disabled={saving}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-60"
                    data-testid="attendance-save-btn"
                >
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor…</> : <><Save className="w-4 h-4" /> Yoklamayı Kaydet</>}
                </button>
            )}
        </div>
    );
};

export default Attendance;
