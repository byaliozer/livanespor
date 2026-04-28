import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "name", label: "Yaş Grubu Kodu", required: true, placeholder: "U15" },
    { name: "age_range", label: "Yaş Aralığı", placeholder: "14-15 yaş" },
    { name: "description", label: "Açıklama", type: "textarea", fullWidth: true },
    { name: "training_days_summary", label: "Antrenman Günleri Özeti", placeholder: "Salı, Perşembe, Cumartesi" },
    { name: "order", label: "Sıra", type: "number" },
    { name: "active", label: "Aktif", type: "checkbox" },
];
const columns = [
    { key: "name", label: "Kod" }, { key: "age_range", label: "Yaş" }, { key: "order", label: "Sıra" }, { key: "active", label: "Aktif" },
];
const AcademyGroups = () => <CrudPage title="Yaş Grupları" collection="academy_groups" fields={fields} columns={columns} defaultValues={{ active: true }} />;
export default AcademyGroups;
