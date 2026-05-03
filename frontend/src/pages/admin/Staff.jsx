import CrudPage from "@/components/admin/CrudPage";

const fields = [
    { name: "name", label: "İsim", required: true },
    { name: "role_title", label: "Görev" },
    { name: "category", label: "Kategori", type: "select", options: [
        { value: "a-team", label: "A Takım" }, { value: "academy", label: "Akademi" },
    ]},
    { name: "photo_url", label: "Fotoğraf", type: "image", purpose: "staff", fullWidth: true },
    { name: "bio", label: "Biyografi", type: "textarea", fullWidth: true },
    { name: "order", label: "Sıra", type: "number" },
    { name: "active", label: "Aktif", type: "checkbox" },
];
const columns = [
    { key: "photo_url", label: "" }, { key: "name", label: "İsim" },
    { key: "role_title", label: "Görev" }, { key: "category", label: "Kategori" }, { key: "order", label: "Sıra" },
];
const Staff = () => <CrudPage title="Teknik Ekip" collection="staff" fields={fields} columns={columns} defaultValues={{ active: true, category: "a-team" }} />;
export default Staff;
