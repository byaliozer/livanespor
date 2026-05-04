import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "group_label", label: "Takım", type: "select", required: true, options: [
        { value: "A Takım", label: "A Takım" },
        { value: "U19", label: "U19 (Altyapı)" },
        { value: "U17", label: "U17 (Altyapı)" },
        { value: "U15", label: "U15 (Altyapı)" },
        { value: "U14", label: "U14 (Altyapı)" },
        { value: "U13", label: "U13 (Altyapı)" },
    ]},
    { name: "date", label: "Tarih", type: "date", required: true },
    { name: "time_range", label: "Saat Aralığı", placeholder: "20:00-21:30", required: true },
    { name: "field", label: "Saha", placeholder: "Yolçatı Saha 1" },
    { name: "coach_name", label: "Sorumlu Antrenör" },
    { name: "notes", label: "Not", type: "textarea", fullWidth: true, placeholder: "Taktik antrenmanı, fiziksel hazırlık, vs." },
];

const columns = [
    { key: "date", label: "Tarih" },
    { key: "time_range", label: "Saat" },
    { key: "group_label", label: "Takım" },
    { key: "field", label: "Saha" },
    { key: "coach_name", label: "Antrenör" },
    { key: "attendance_taken", label: "Yoklama" },
];

const Trainings = () => (
    <CrudPage
        title="Antrenman Takvimi"
        collection="team_trainings"
        fields={fields}
        columns={columns}
        defaultValues={{ group_label: "A Takım", attendance_taken: false }}
    />
);
export default Trainings;
