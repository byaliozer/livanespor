import { useEffect, useRef, useState } from "react";
import { adminApi, API } from "@/lib/api";
import { Plus, Edit2, Trash2, X, Save, Search, ImageIcon, Upload, Trash } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Convert /api/public/media/... → absolute, leave data: and http(s) untouched
const absUrl = (v) => {
    if (!v) return "";
    if (v.startsWith("data:") || v.startsWith("http")) return v;
    try { return `${new URL(API).origin}${v}`; } catch { return v; }
};

const ImageField = ({ value, onChange, testid, purpose = "upload" }) => {
    const fileRef = useRef(null);
    const [busy, setBusy] = useState(false);

    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) { toast.error("Sadece resim dosyası yüklenebilir"); return; }
        if (file.size > MAX_IMAGE_BYTES) { toast.error("Dosya 5 MB'dan büyük olamaz"); return; }
        setBusy(true);
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                // Upload to Object Storage via backend → get public_url
                const res = await adminApi.uploadMedia({
                    title: file.name,
                    data_url: reader.result,
                    purpose,
                });
                if (res.public_url) {
                    onChange(res.public_url);  // /api/public/media/...
                    toast.success("Yüklendi (Object Storage)");
                } else {
                    // Fallback: storage failed, keep base64
                    onChange(reader.result);
                    toast.warning("Object Storage erişilemedi — base64 kullanılıyor");
                }
            } catch (e) {
                toast.error("Yüklenemedi: " + (e?.response?.data?.detail || e.message));
            } finally { setBusy(false); }
        };
        reader.onerror = () => { setBusy(false); toast.error("Dosya okunamadı"); };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-3" data-testid={testid}>
            {value ? (
                <div className="relative inline-block">
                    <img src={absUrl(value)} alt="Yüklenen" className="w-32 h-32 object-cover border border-liv-border" />
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
                        aria-label="Resmi kaldır"
                        data-testid={`${testid}-clear`}
                    >
                        <Trash className="w-3 h-3" />
                    </button>
                </div>
            ) : null}

            <div
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
                className="border-2 border-dashed border-liv-border bg-liv-surface px-4 py-6 text-center hover:border-liv-yellow/50 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
                data-testid={`${testid}-dropzone`}
            >
                <Upload className="w-5 h-5 mx-auto text-neutral-500 mb-2" />
                <div className="text-xs text-neutral-400">{busy ? "Yükleniyor..." : "Bilgisayardan seç veya buraya sürükle"}</div>
                <div className="text-[10px] text-neutral-600 mt-1">PNG, JPG, WEBP · max 5 MB</div>
                <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    data-testid={`${testid}-input`}
                />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-500 uppercase">veya URL:</span>
                <input
                    type="text"
                    value={value && !value.startsWith("data:") ? value : ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="https://..."
                    className="liv-input flex-1 !text-xs"
                    data-testid={`${testid}-url`}
                />
            </div>
        </div>
    );
};

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
                                                    return v ? <img src={absUrl(v)} alt="" className="w-12 h-12 object-cover" /> : <ImageIcon className="w-5 h-5 text-neutral-600" />;
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
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4" data-testid="crud-modal" onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-3xl max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-5 border-b border-liv-border flex-shrink-0">
                            <h2 className="font-display text-2xl uppercase">{editing.__new ? "Yeni Kayıt" : "Düzenle"}</h2>
                            <button onClick={() => setEditing(null)} className="text-neutral-400 hover:text-white" data-testid="crud-modal-close"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto flex-1">
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
                                    ) : f.type === "image" ? (
                                        <ImageField value={editing[f.name] ?? ""} onChange={(v) => setEditing({ ...editing, [f.name]: v })} testid={`crud-image-${f.name}`} purpose={f.purpose || "upload"} />
                                    ) : (
                                        <input type={f.type || "text"} value={editing[f.name] ?? ""} onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })} className="liv-input" placeholder={f.placeholder} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-4 md:p-5 border-t border-liv-border flex justify-end gap-3 flex-shrink-0 bg-liv-card">
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
export { ImageField, absUrl };
