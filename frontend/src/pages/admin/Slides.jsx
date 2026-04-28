import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "title", label: "Başlık", required: true, fullWidth: true },
    { name: "subtitle", label: "Alt Başlık", fullWidth: true },
    { name: "description", label: "Açıklama", type: "textarea", fullWidth: true },
    { name: "image_url", label: "Görsel URL", fullWidth: true },
    { name: "cta_primary_label", label: "Buton 1 Metin" },
    { name: "cta_primary_link", label: "Buton 1 Link" },
    { name: "cta_secondary_label", label: "Buton 2 Metin" },
    { name: "cta_secondary_link", label: "Buton 2 Link" },
    { name: "order", label: "Sıra", type: "number" },
    { name: "active", label: "Aktif", type: "checkbox" },
];
const columns = [
    { key: "image_url", label: "" }, { key: "title", label: "Başlık" }, { key: "order", label: "Sıra" }, { key: "active", label: "Aktif" },
];
const Slides = () => <CrudPage title="Hero Slider" collection="hero_slides" fields={fields} columns={columns} defaultValues={{ active: true, order: 1 }} />;
export default Slides;
