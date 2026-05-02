import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "title", label: "Başlık", required: true },
    { name: "photo_url", label: "Fotoğraf", type: "image", purpose: "team_photo", fullWidth: true, required: true },
    { name: "category", label: "Kategori", type: "select", options: [
        { value: "team", label: "Takım Fotosu" },
        { value: "stadium", label: "Stadyum/Tesis" },
        { value: "fans", label: "Taraftar" },
        { value: "training", label: "Antrenman" },
        { value: "other", label: "Diğer" },
    ]},
    { name: "description", label: "Açıklama", type: "textarea", fullWidth: true },
    { name: "active", label: "Aktif", type: "checkbox" },
];

const columns = [
    { key: "photo_url", label: "" },
    { key: "title", label: "Başlık" },
    { key: "category", label: "Kategori" },
    { key: "active", label: "Aktif" },
];

const TeamPhotos = () => (
    <CrudPage
        title="Takım Fotoğrafları"
        collection="team_photos"
        fields={fields}
        columns={columns}
        defaultValues={{ active: true, category: "team" }}
    />
);
export default TeamPhotos;
