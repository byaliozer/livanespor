import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "competition", label: "Lig / Turnuva" },
    { name: "season", label: "Sezon" },
    { name: "home_team", label: "Ev Sahibi", required: true },
    { name: "away_team", label: "Deplasman", required: true },
    { name: "opponent", label: "Rakip (kısa)" },
    { name: "is_home", label: "Ev Sahibi miyiz?", type: "checkbox" },
    { name: "match_date", label: "Tarih/Saat", type: "datetime-local", placeholder: "ISO" },
    { name: "venue", label: "Saha" },
    { name: "status", label: "Durum", type: "select", options: [
        { value: "upcoming", label: "Yaklaşan" }, { value: "finished", label: "Tamamlandı" }, { value: "postponed", label: "Ertelendi" },
    ]},
    { name: "home_score", label: "Ev Skoru", type: "number" },
    { name: "away_score", label: "Dep. Skoru", type: "number" },
    { name: "summary", label: "Özet", type: "textarea", fullWidth: true },
    { name: "opponent_logo", label: "Rakip Logo URL", fullWidth: true },
];
const columns = [
    { key: "match_date", label: "Tarih", render: (r) => r.match_date ? new Date(r.match_date).toLocaleString("tr-TR") : "—" },
    { key: "home_team", label: "Ev" },
    { key: "away_team", label: "Deplasman" },
    { key: "status", label: "Durum" },
    { key: "home_score", label: "Skor", render: (r) => r.status === "finished" ? `${r.home_score}-${r.away_score}` : "—" },
];
const Matches = () => <CrudPage title="Maçlar" collection="matches" fields={fields} columns={columns} defaultValues={{ status: "upcoming", competition: "BAL Ligi 4. Grup", season: "2025-2026" }} />;
export default Matches;
