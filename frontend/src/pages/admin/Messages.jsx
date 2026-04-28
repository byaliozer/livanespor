import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Mail, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { toast } from "sonner";

const Messages = () => {
    const [list, setList] = useState([]);
    const [active, setActive] = useState(null);
    const [q, setQ] = useState("");
    const load = () => adminApi.list("contact_messages").then(setList);
    useEffect(() => { load(); }, []);
    const filtered = list.filter((m) => !q || JSON.stringify(m).toLowerCase().includes(q.toLowerCase()));
    const toggleRead = async (m) => {
        const newStatus = m.status === "read" ? "unread" : "read";
        await adminApi.update("contact_messages", m.id, { ...m, status: newStatus });
        load();
    };
    const remove = async (m) => {
        if (!window.confirm("Mesaj silinsin mi?")) return;
        await adminApi.delete("contact_messages", m.id);
        toast.success("Silindi"); load();
    };
    return (
        <div className="space-y-6" data-testid="admin-messages">
            <div>
                <div className="overline">İletişim</div>
                <h1 className="font-display text-5xl uppercase mt-1">Mesajlar</h1>
            </div>
            <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara..." className="liv-input pl-10" /></div>
            <div className="bg-liv-card border border-liv-border divide-y divide-liv-border">
                {filtered.map((m) => (
                    <div key={m.id} className={`p-4 flex items-start gap-4 ${m.status === "unread" ? "bg-liv-yellow/5" : ""}`}>
                        <Mail className={`w-5 h-5 mt-0.5 ${m.status === "unread" ? "text-liv-yellow" : "text-neutral-500"}`} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <div className="font-semibold">{m.name || "İsimsiz"}</div>
                                <div className="text-xs text-neutral-500">{m.email}</div>
                                <div className="text-xs text-neutral-500 ml-auto">{m.created_at && new Date(m.created_at).toLocaleString("tr-TR")}</div>
                            </div>
                            {m.subject && <div className="text-sm font-bold mt-1">{m.subject}</div>}
                            <div className="text-sm text-neutral-300 mt-1 line-clamp-2">{m.message}</div>
                            {active === m.id && <div className="text-sm text-neutral-300 mt-2 whitespace-pre-line bg-liv-surface p-3">{m.message}</div>}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button onClick={() => setActive(active === m.id ? null : m.id)} className="text-xs text-liv-yellow hover:underline">{active === m.id ? "Kapat" : "Detay"}</button>
                            <button onClick={() => toggleRead(m)} className="text-xs text-neutral-400 hover:text-liv-yellow inline-flex items-center gap-1">{m.status === "read" ? <><EyeOff className="w-3 h-3" /> Okunmadı</> : <><Eye className="w-3 h-3" /> Okundu</>}</button>
                            <button onClick={() => remove(m)} className="text-xs text-red-400 hover:underline inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Sil</button>
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && <div className="p-8 text-center text-neutral-500">Mesaj yok.</div>}
            </div>
        </div>
    );
};
export default Messages;
