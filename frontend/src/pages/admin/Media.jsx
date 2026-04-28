import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

const Media = () => {
    const [list, setList] = useState([]);
    const load = () => adminApi.list("media").then(setList);
    useEffect(() => { load(); }, []);
    const handleFile = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await adminApi.uploadMedia({ title: file.name, data_url: reader.result });
                toast.success("Yüklendi"); load();
            } catch (err) { toast.error("Yüklenemedi"); }
        };
        reader.readAsDataURL(file);
    };
    const remove = async (m) => {
        if (!window.confirm("Silinsin mi?")) return;
        await adminApi.delete("media", m.id); load();
    };
    return (
        <div className="space-y-6" data-testid="admin-media">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Medya</div>
                    <h1 className="font-display text-5xl uppercase mt-1">Medya Kütüphanesi</h1>
                </div>
                <label className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" /> Görsel Yükle
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="media-upload-input" />
                </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {list.map((m) => (
                    <div key={m.id} className="bg-liv-card border border-liv-border group relative">
                        <div className="aspect-square overflow-hidden bg-black">
                            <img src={m.data_url || m.url} alt={m.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2">
                            <div className="text-xs truncate">{m.title}</div>
                            <div className="text-[10px] text-neutral-500 uppercase">{m.source || "upload"}{m.model ? ` · ${m.model}` : ""}</div>
                        </div>
                        <button onClick={() => remove(m)} className="absolute top-2 right-2 w-7 h-7 bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                    </div>
                ))}
                {list.length === 0 && <div className="col-span-6 text-center text-neutral-500 py-12">Henüz medya yok.</div>}
            </div>
        </div>
    );
};
export default Media;
