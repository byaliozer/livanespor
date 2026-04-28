import CrudPage from "@/components/admin/CrudPage";

const DAYS = [
    { value: 1, label: "Pazartesi" }, { value: 2, label: "Salı" }, { value: 3, label: "Çarşamba" },
    { value: 4, label: "Perşembe" }, { value: 5, label: "Cuma" }, { value: 6, label: "Cumartesi" }, { value: 7, label: "Pazar" },
];

const fields = [
    { name: "group_code", label: "Yaş Grubu", required: true, placeholder: "U15" },
    { name: "day_of_week", label: "Gün", type: "select", options: DAYS.map((d) => ({ value: d.value, label: d.label })) },
    { name: "day_name", label: "Gün Adı", placeholder: "Salı" },
    { name: "time_range", label: "Saat", placeholder: "17:00-18:00" },
    { name: "field", label: "Saha", placeholder: "Saha 1" },
    { name: "coach", label: "Antrenör" },
];
const columns = [
    { key: "group_code", label: "Grup" }, { key: "day_name", label: "Gün" }, { key: "time_range", label: "Saat" },
    { key: "field", label: "Saha" }, { key: "coach", label: "Antrenör" },
];
const AcademySessions = () => (
    <CrudPage
        title="Antrenman Takvimi"
        collection="training_sessions"
        fields={fields}
        columns={columns}
        onBeforeSave={(d) => { if (d.day_of_week) d.day_of_week = Number(d.day_of_week); return d; }}
    />
);
export default AcademySessions;
