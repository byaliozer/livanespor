import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Plus, Edit2, Trash2, X, Save, Search, ImageIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Generic CRUD admin page.
 * fields: [{ name, label, type: "text"|"textarea"|"number"|"checkbox"|"select"|"date"|"datetime-local"|"image"|"json"|"slug-source", options?, required?, placeholder? }]
 * columns: array of field names to show in the list
 * title: page title
 * collection: backend collection name (e.g., "players")
 */
const CrudPage = ({
    title, collection, fields, columns, defaultValues = {},
    renderRow, customActions, onAfterSave, onBeforeSave,
}) => {
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState("");

    const load = () =>
        adminApi.list(collection).then((rows) => { setList(rows); setLoading(false); }).catch(() => setLoading(false));

    useEffect(() => { load(); }, [collection]); // eslint-disable-line

    const filtered = list.filter((r) => {
        if (!search) return true;
        const txt = JSON.stringify(r).toLowerCase();
        return txt.includes(search.toLowerCase());
    });

    const startCreate = () => setEditing({ ...defaultValues, __new: true });
    const startEdit = (row) => setEditing({ ...row });

    const save = async () => {
        const data = { ...editing };
        delete data.__new;
        const prepared = onBeforeSave ? onBeforeSave(data) : data;
        try {
            if (editing.__new) {
                await adminApi.create(collection, prepared);
                toast.success("Oluşturuldu");
            } else {
                await adminApi.update(collection, editing.id, prepared);
                toast.success("Güncellendi");
            }
            setEditing(null);
            await load();
            onAfterSave?.();
        } catch (e) {
            toast.error("Kaydedilemedi: " + (e?.response?.data?.detail || e.message));
        }
    };

    const remove = async (row) => {
        if (!window.confirm(`${row.name || row.title || row.id} silinsin mi?`)) return;
        try {
            await adminApi.delete(collection, row.id);
            toast.success("Silindi");
            load();
        } catch (e) { toast.error("Silinemedi"); }
    };

    return (
        <div className="space-y-6" data-testid={`admin-crud-${collection}`}>
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">{collection}</div>
                    <h1 className="font-display text-4xl md:text-5xl uppercase mt-1">{title}</h1>
                </div>
                <div className="flex gap-2">
                    {customActions}
                    <button onClick={startCreate} className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2" data-testid="crud-create-btn"><Plus className="w-4 h-4" /> Yeni Ekle</button>
                </div>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara..." className="liv-input pl-10" data-testid="crud-search" />
            </div>

            <div className="bg-liv-card border border-liv-border overflow-x-auto">
                {loading ? (
                    <div className="p-8 text-neutral-400">Yükleniyor…</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-liv-surface text-xs uppercase tracking-widest text-neutral-500">
                            <tr>
                                {columns.map((c) => <th key={c.key} className="text-left px-4 py-3">{c.label}</th>)}
                                <th className="text-right px-4 py-3">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row) => (
                                <tr key={row.id} className="border-t border-liv-border/60 hover:bg-liv-surface/60" data-testid={`crud-row-${row.id}`}>
                                    {columns.map((c) => (
                                        <td key={c.key} className="px-4 py-3 align-middle">
                                            {c.render ? c.render(row) : (() => {
                                                const v = row[c.key];
                                                if (c.key === "photo_url" || c.key === "logo_url" || c.key === "cover_image" || c.key === "image_url") {
                                                    return v ? <img src={v} alt="" className="w-12 h-12 object-cover" /> : <ImageIcon className="w-5 h-5 text-neutral-600" />;
                                                }
                                                if (typeof v === "boolean") return v ? "✓" : "—";
                                                if (typeof v === "object" && v !== null) return JSON.stringify(v).slice(0, 60);
                                                return String(v ?? "—").slice(0, 80);
                                            })()}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <button onClick={() => startEdit(row)} className="text-liv-yellow hover:underline mr-3 inline-flex items-center gap-1" data-testid={`crud-edit-${row.id}`}><Edit2 className="w-3 h-3" /> Düzenle</button>
                                        <button onClick={() => remove(row)} className="text-red-400 hover:underline inline-flex items-center gap-1" data-testid={`crud-delete-${row.id}`}><Trash2 className="w-3 h-3" /> Sil</button>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-neutral-500">Kayıt yok.</td></tr>}
                        </tbody>
                    </table>
                )}
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start md:items-center justify-center p-4 overflow-y-auto" data-testid="crud-modal">
                    <div className="bg-liv-card border border-liv-border w-full max-w-3xl my-8">
                        <div className="flex items-center justify-between p-5 border-b border-liv-border">
                            <h2 className="font-display text-2xl uppercase">{editing.__new ? "Yeni Kayıt" : "Düzenle"}</h2>
                            <button onClick={() => setEditing(null)} className="text-neutral-400 hover:text-white" data-testid="crud-modal-close"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {fields.map((f) => (
                                <div key={f.name} className={f.fullWidth ? "md:col-span-2" : ""}>
                                    <label className="liv-label">{f.label}{f.required && " *"}</label>
                                    {f.type === "textarea" ? (
                                        <textarea rows={f.rows || 4} value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="liv-input" />
                                    ) : f.type === "checkbox" ? (
                                        <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={!!editing[f.name]} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.checked })} className="w-4 h-4 accent-liv-yellow" /> <span className="text-sm text-neutral-300">Aktif</span></label>
                                    ) : f.type === "select" ? (
                                        <select value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="liv-input">
                                            <option value="">Seçiniz</option>
                                            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    ) : f.type === "number" ? (
                                        <input type="number" value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value === "" ? "" : Number(e.target.value) })} className="liv-input" />
                                    ) : f.type === "json" ? (
                                        <textarea rows={4} value={typeof editing[f.name] === "string" ? editing[f.name] : JSON.stringify(editing[f.name] ?? {}, null, 2)} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="liv-input font-mono text-xs" />
                                    ) : (
                                        <input type={f.type || "text"} value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="liv-input" placeholder={f.placeholder} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t border-liv-border flex justify-end gap-3">
                            <button onClick={() => setEditing(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={save} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="crud-save-btn"><Save className="w-4 h-4" /> Kaydet</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrudPage;
