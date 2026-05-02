import CrudPage from "@/components/admin/CrudPage";

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
    />
);
export default Players;
