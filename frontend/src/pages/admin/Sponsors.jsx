import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "name", label: "Firma Adı", required: true },
    { name: "logo_url", label: "Logo URL", fullWidth: true },
    { name: "level", label: "Sponsorluk Seviyesi", type: "select", options: [
        { value: "main", label: "Ana Sponsor" }, { value: "forma", label: "Forma Sponsoru" },
        { value: "jersey", label: "Forma Sponsoru (Yaş)" }, { value: "supporter", label: "Destekçi" },
        { value: "corporate", label: "Kurumsal İş Ortağı" },
    ]},
    { name: "scope", label: "Görünüm Alanı", type: "select", options: [
        { value: "club", label: "Sadece Kulüp" }, { value: "academy", label: "Sadece Akademi" }, { value: "both", label: "Her İkisi" },
    ]},
    { name: "age_group", label: "Yaş Grubu (opsiyonel)", placeholder: "U15" },
    { name: "website", label: "Web Sitesi", placeholder: "https://www.example.com" },
    { name: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/kullanici/ veya @kullanici" },
    { name: "description", label: "Açıklama", type: "textarea", fullWidth: true },
    { name: "order", label: "Sıra", type: "number" },
    { name: "active", label: "Aktif", type: "checkbox" },
];
const columns = [
    { key: "logo_url", label: "" }, { key: "name", label: "İsim" },
    { key: "level", label: "Seviye" }, { key: "scope", label: "Alan" }, { key: "website", label: "Web" }, { key: "instagram", label: "Instagram" }, { key: "order", label: "Sıra" },
];
const Sponsors = () => <CrudPage title="Sponsorlar" collection="sponsors" fields={fields} columns={columns} defaultValues={{ active: true, scope: "club", level: "main" }} />;
export default Sponsors;
