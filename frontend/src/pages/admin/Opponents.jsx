import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "name", label: "Kulüp Adı", required: true, placeholder: "Mudanyaspor", fullWidth: true },
    { name: "crest_url", label: "Kulüp Logosu / Armaası", type: "image", purpose: "opponent_crest", fullWidth: true },
    { name: "city", label: "Şehir / İlçe (opsiyonel)", placeholder: "Bursa / Mudanya" },
    { name: "notes", label: "Notlar (opsiyonel)", type: "textarea", fullWidth: true },
];

const columns = [
    { key: "crest_url", label: "" },
    { key: "name", label: "Kulüp Adı" },
    { key: "city", label: "Şehir" },
];

const Opponents = () => (
    <CrudPage
        title="Rakip Kulüpler"
        collection="opponent_clubs"
        fields={fields}
        columns={columns}
        defaultValues={{}}
    />
);

export default Opponents;
