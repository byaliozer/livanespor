import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "rank", label: "Sıra", type: "number", required: true },
    { name: "team_name", label: "Takım", required: true },
    { name: "league_group", label: "Grup (1.Grup / Play-Off)", placeholder: "1.Grup" },
    { name: "logo_url", label: "Logo URL", fullWidth: true },
    { name: "played", label: "O", type: "number" },
    { name: "wins", label: "G", type: "number" },
    { name: "draws", label: "B", type: "number" },
    { name: "losses", label: "M", type: "number" },
    { name: "goals_for", label: "AG", type: "number" },
    { name: "goals_against", label: "YG", type: "number" },
    { name: "goal_difference", label: "Av", type: "number" },
    { name: "points", label: "Puan", type: "number" },
    { name: "season", label: "Sezon" },
];
const columns = [
    { key: "rank", label: "#" }, { key: "team_name", label: "Takım" }, { key: "league_group", label: "Grup" },
    { key: "played", label: "O" }, { key: "wins", label: "G" }, { key: "draws", label: "B" }, { key: "losses", label: "M" },
    { key: "points", label: "Pts" },
];
const Standings = () => <CrudPage title="Puan Durumu" collection="standings" fields={fields} columns={columns} defaultValues={{ season: "2025-2026", league_group: "1.Grup" }} />;
export default Standings;
