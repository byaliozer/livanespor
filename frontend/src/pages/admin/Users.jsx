import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

const Users = () => {
    const [list, setList] = useState([]);
    const [creating, setCreating] = useState(null);
    const load = () => api.get("/auth/users").then((r) => setList(r.data));
    useEffect(() => { load(); }, []);
    const save = async () => {
        try {
            await api.post("/auth/users", creating);
            toast.success("Kullanıcı oluşturuldu");
            setCreating(null); load();
        } catch (e) { toast.error("Hata: " + (e?.response?.data?.detail || e.message)); }
    };
    return (
        <div className="space-y-6" data-testid="admin-users">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Sistem</div>
                    <h1 className="font-display text-5xl uppercase mt-1">Kullanıcılar</h1>
                </div>
                <button onClick={() => setCreating({ name: "", email: "", password: "", role: "editor" })} className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Yeni Kullanıcı</button>
            </div>
            <div className="bg-liv-card border border-liv-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-liv-surface text-xs uppercase tracking-widest text-neutral-500">
                        <tr><th className="text-left px-4 py-3">İsim</th><th className="text-left py-3">E-posta</th><th className="text-left py-3">Rol</th><th className="text-left py-3 px-4">Oluşturulma</th></tr>
                    </thead>
                    <tbody>
                        {list.map((u) => (
                            <tr key={u.id} className="border-t border-liv-border/60">
                                <td className="px-4 py-3 font-semibold">{u.name}</td>
                                <td className="py-3">{u.email}</td>
                                <td className="py-3"><span className="text-xs uppercase tracking-widest text-liv-yellow">{u.role}</span></td>
                                <td className="py-3 px-4 text-xs text-neutral-500">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {creating && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-liv-card border border-liv-border w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-liv-border">
                            <h2 className="font-display text-2xl uppercase">Yeni Kullanıcı</h2>
                            <button onClick={() => setCreating(null)}><X /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div><label className="liv-label">İsim</label><input value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="liv-input" /></div>
                            <div><label className="liv-label">E-posta</label><input type="email" value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} className="liv-input" /></div>
                            <div><label className="liv-label">Şifre</label><input type="password" value={creating.password} onChange={(e) => setCreating({ ...creating, password: e.target.value })} className="liv-input" /></div>
                            <div>
                                <label className="liv-label">Rol</label>
                                <select value={creating.role} onChange={(e) => setCreating({ ...creating, role: e.target.value })} className="liv-input">
                                    <option value="admin">Admin</option>
                                    <option value="editor">Editör</option>
                                    <option value="academy_lead">Akademi Sorumlusu</option>
                                    <option value="media_lead">Medya Sorumlusu</option>
                                    <option value="sponsor_lead">Sponsor Sorumlusu</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 border-t border-liv-border flex justify-end gap-2">
                            <button onClick={() => setCreating(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={save} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2"><Save className="w-4 h-4" /> Oluştur</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Users;
