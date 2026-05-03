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
            const payload = { ...creating, email: (creating.email || "").trim().toLowerCase() };
            await api.post("/auth/users", payload);
            toast.success("Yönetici oluşturuldu");
            setCreating(null); load();
        } catch (e) { toast.error("Hata: " + (e?.response?.data?.detail || e.message)); }
    };
    const roleLabel = (r) => ({ super_admin: "Süper Admin", admin: "Yönetici" })[r] || r;
    return (
        <div className="space-y-6" data-testid="admin-users">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="overline">Sistem</div>
                    <h1 className="font-display text-5xl uppercase mt-1">Kullanıcılar</h1>
                    <p className="text-xs text-neutral-500 mt-1">Süper Admin her şeyi yapabilir. Yönetici yalnızca günlük içerik yönetimi yapabilir (AI ayarları, paket ve kredi düzenlemesi yapamaz).</p>
                </div>
                <button onClick={() => setCreating({ name: "", email: "", password: "", role: "admin" })} className="btn-primary !py-2.5 !px-4 !text-xs inline-flex items-center gap-2" data-testid="users-new-btn"><Plus className="w-4 h-4" /> Yeni Yönetici</button>
            </div>
            <div className="bg-liv-card border border-liv-border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-liv-surface text-xs uppercase tracking-widest text-neutral-500">
                        <tr><th className="text-left px-4 py-3">İsim</th><th className="text-left py-3">Kullanıcı Adı</th><th className="text-left py-3">Rol</th><th className="text-left py-3 px-4">Oluşturulma</th></tr>
                    </thead>
                    <tbody>
                        {list.map((u) => (
                            <tr key={u.id} className="border-t border-liv-border/60" data-testid={`users-row-${u.id}`}>
                                <td className="px-4 py-3 font-semibold">{u.name}</td>
                                <td className="py-3">{u.email}</td>
                                <td className="py-3"><span className={`text-xs uppercase tracking-widest ${u.role === 'super_admin' ? 'text-liv-yellow font-bold' : 'text-neutral-300'}`}>{roleLabel(u.role)}</span></td>
                                <td className="py-3 px-4 text-xs text-neutral-500">{new Date(u.created_at).toLocaleDateString("tr-TR")}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {creating && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 md:p-4" onClick={(e) => { if (e.target === e.currentTarget) setCreating(null); }}>
                    <div className="bg-liv-card border border-liv-border w-full max-w-md max-h-[92vh] flex flex-col rounded-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 md:p-5 border-b border-liv-border flex-shrink-0">
                            <h2 className="font-display text-2xl uppercase">Yeni Yönetici</h2>
                            <button onClick={() => setCreating(null)}><X /></button>
                        </div>
                        <div className="p-4 md:p-5 space-y-4 overflow-y-auto flex-1">
                            <div><label className="liv-label">İsim</label><input value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} className="liv-input" data-testid="users-new-name" /></div>
                            <div><label className="liv-label">Kullanıcı Adı</label><input value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} className="liv-input" placeholder="ornek. aliozer" data-testid="users-new-username" />
                                <p className="text-[11px] text-neutral-500 mt-1">Küçük harf, boşluksuz. Giriş yaparken bu isim kullanılacak.</p>
                            </div>
                            <div><label className="liv-label">Şifre</label><input type="password" value={creating.password} onChange={(e) => setCreating({ ...creating, password: e.target.value })} className="liv-input" placeholder="En az 6 karakter" data-testid="users-new-password" /></div>
                            <div className="bg-liv-surface border border-liv-border p-3">
                                <div className="text-xs uppercase tracking-widest text-liv-yellow mb-1">Rol: Yönetici</div>
                                <p className="text-[11px] text-neutral-400">Kulüp yöneticisi rolü; günlük içerik yönetimi yapabilir. API ayarlarına, paket değişimine ve kredi düzenlemesine erişemez.</p>
                                <input type="hidden" value="admin" readOnly />
                            </div>
                        </div>
                        <div className="p-4 md:p-5 border-t border-liv-border flex justify-end gap-2 flex-shrink-0 bg-liv-card">
                            <button onClick={() => setCreating(null)} className="btn-ghost-light !py-2 !px-4 !text-xs">İptal</button>
                            <button onClick={save} className="btn-primary !py-2 !px-4 !text-xs inline-flex items-center gap-2" data-testid="users-new-save"><Save className="w-4 h-4" /> Oluştur</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Users;
