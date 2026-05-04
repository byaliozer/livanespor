import { useEffect, useState } from "react";
import CrudPage from "@/components/admin/CrudPage";
import { api } from "@/lib/api";
import { CheckCircle, XCircle } from "lucide-react";

const fields = [
    { name: "name", label: "Ad Soyad", required: true },
    { name: "jersey_number", label: "Forma No", type: "number" },
    { name: "position", label: "Mevki", type: "select", options: [
        { value: "Kaleci", label: "Kaleci" }, { value: "Defans", label: "Defans" },
        { value: "Orta Saha", label: "Orta Saha" }, { value: "Forvet", label: "Forvet" },
    ]},
    { name: "age", label: "Yaş", type: "number" },
    { name: "birth_year", label: "Doğum Yılı", type: "number" },
    { name: "birth_date", label: "Doğum Tarihi (YYYY-MM-DD)", type: "text", placeholder: "1998-05-21" },
    { name: "height_cm", label: "Boy (cm)", type: "number" },
    { name: "preferred_foot", label: "Ayak", type: "select", options: [
        { value: "Sağ", label: "Sağ" }, { value: "Sol", label: "Sol" }, { value: "Çift", label: "Çift" },
    ]},
    { name: "photo_url", label: "Fotoğraf", type: "image", fullWidth: true },
    { name: "bio", label: "Biyografi", type: "textarea", fullWidth: true },
    { name: "is_captain", label: "Kaptan", type: "checkbox" },
    { name: "top_scorer", label: "Gol Kralı", type: "checkbox" },
    { name: "top_assist", label: "Asist Kralı", type: "checkbox" },
    { name: "is_featured", label: "Öne Çıkan", type: "checkbox" },
    { name: "active", label: "Aktif", type: "checkbox" },
    { name: "stats", label: "İstatistikler (JSON: maç, gol, asist, sarı, kırmızı)", type: "json", fullWidth: true },
];

const columns = [
    { key: "photo_url", label: "" },
    { key: "name", label: "İsim" },
    { key: "jersey_number", label: "No" },
    { key: "position", label: "Mevki" },
    { key: "age", label: "Yaş" },
    { key: "active", label: "Aktif" },
];

// Inline component: shows the player's last 10 attendance records + percentage
const AttendanceHistory = ({ playerId }) => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!playerId) return;
        api.get(`/admin/players/${playerId}/attendance-history?limit=10`)
            .then((r) => setData(r.data))
            .catch(() => setError(true));
    }, [playerId]);

    if (error) return null;
    if (!data) return <div className="text-xs text-neutral-500">Devamlılık yükleniyor…</div>;
    if (data.total_count === 0) {
        return (
            <div className="border-t border-liv-border pt-3 mt-2">
                <div className="text-xs uppercase tracking-widest text-neutral-500">Antrenman Devamlılığı</div>
                <div className="text-sm text-neutral-400 mt-1">Henüz yoklama kaydı yok.</div>
            </div>
        );
    }
    return (
        <div className="border-t border-liv-border pt-3 mt-2" data-testid="player-attendance-history">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs uppercase tracking-widest text-neutral-400">Antrenman Devamlılığı</div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-emerald-400">Geldi: <strong>{data.present_count}</strong></span>
                    <span className="text-red-400">Gelmedi: <strong>{data.absent_count}</strong></span>
                    <span className="font-display text-2xl text-liv-yellow leading-none">{data.attendance_pct ?? "—"}%</span>
                </div>
            </div>
            {data.recent.length > 0 && (
                <div className="mt-3">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Son {data.recent.length} antrenman (yeniden eskiye)</div>
                    <div className="flex gap-1.5 flex-wrap">
                        {data.recent.map((r) => (
                            <div
                                key={r.id}
                                title={`${r.training_date} · ${r.training_group} · ${r.status === "present" ? "Geldi" : `Gelmedi: ${r.reason || "—"}`}`}
                                className={`w-7 h-7 flex items-center justify-center rounded-sm border ${r.status === "present" ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400" : "bg-red-500/15 border-red-500/50 text-red-400"}`}
                            >
                                {r.status === "present" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </div>
                        ))}
                    </div>
                    {data.recent.some((r) => r.status === "absent") && (
                        <div className="text-[11px] text-neutral-400 mt-2">
                            Devamsızlık sebepleri: {data.recent.filter((r) => r.status === "absent").map((r) => `${r.training_date}: ${r.reason || "—"}`).join(" · ")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const Players = () => (
    <CrudPage
        title="Oyuncular"
        collection="players"
        fields={fields}
        columns={columns}
        defaultValues={{ active: true, stats: {} }}
        onBeforeSave={(d) => {
            if (typeof d.stats === "string") {
                try { d.stats = JSON.parse(d.stats); } catch { d.stats = {}; }
            }
            return d;
        }}
        extraModalContent={(player) => <AttendanceHistory playerId={player.id} />}
    />
);
export default Players;
