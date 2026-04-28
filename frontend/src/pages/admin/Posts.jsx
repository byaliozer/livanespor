import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "title", label: "Başlık", required: true, fullWidth: true },
    { name: "category", label: "Kategori", type: "select", options: [
        { value: "kulup-haberleri", label: "Kulüp Haberleri" }, { value: "mac-onu", label: "Maç Önü" },
        { value: "mac-sonu", label: "Maç Sonu" }, { value: "duyurular", label: "Duyurular" },
        { value: "transfer", label: "Transfer" }, { value: "akademi-haberleri", label: "Akademi Haberleri" },
        { value: "sponsor-haberleri", label: "Sponsor Haberleri" }, { value: "etkinlikler", label: "Etkinlikler" },
    ]},
    { name: "status", label: "Durum", type: "select", options: [
        { value: "draft", label: "Taslak" }, { value: "published", label: "Yayında" }, { value: "scheduled", label: "Planlandı" },
    ]},
    { name: "cover_image", label: "Kapak Görseli URL", fullWidth: true },
    { name: "excerpt", label: "Özet", type: "textarea", fullWidth: true, rows: 2 },
    { name: "content", label: "İçerik (HTML destekler)", type: "textarea", fullWidth: true, rows: 10 },
    { name: "tags", label: "Etiketler (virgülle ayır)", placeholder: "livanespor, akademi" },
    { name: "author", label: "Yazar" },
    { name: "published_at", label: "Yayın Tarihi", type: "datetime-local" },
    { name: "seo_title", label: "SEO Başlık", fullWidth: true },
    { name: "seo_description", label: "SEO Açıklama", type: "textarea", fullWidth: true, rows: 2 },
    { name: "og_image", label: "OG Görsel URL", fullWidth: true },
];
const columns = [
    { key: "cover_image", label: "" }, { key: "title", label: "Başlık" },
    { key: "category", label: "Kategori" }, { key: "status", label: "Durum" },
    { key: "published_at", label: "Yayın", render: (r) => r.published_at ? new Date(r.published_at).toLocaleDateString("tr-TR") : "—" },
];
const Posts = () => (
    <CrudPage
        title="Haberler & Blog"
        collection="posts"
        fields={fields}
        columns={columns}
        defaultValues={{ status: "draft", author: "Livanespor" }}
        onBeforeSave={(d) => {
            if (typeof d.tags === "string") d.tags = d.tags.split(",").map((s) => s.trim()).filter(Boolean);
            return d;
        }}
    />
);
export default Posts;
