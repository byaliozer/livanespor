import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, clearToken } from "@/lib/api";
import { Save, KeyRound, User as UserIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const Account = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        new_username: "",
        new_name: "",
        new_password: "",
        confirm_password: "",
        current_password: "",
    });
    const [loading, setLoading] = useState(false);

    const update = (k, v) => setForm({ ...form, [k]: v });

    const submit = async (e) => {
        e.preventDefault();
        if (!form.current_password) {
            toast.error("Mevcut şifrenizi girmelisiniz");
            return;
        }
        if (form.new_password && form.new_password !== form.confirm_password) {
            toast.error("Yeni şifre ile onay şifresi eşleşmiyor");
            return;
        }
        if (!form.new_username && !form.new_password && !form.new_name) {
            toast.error("En az bir alanı değiştirmelisiniz");
            return;
        }
        setLoading(true);
        try {
            const payload = { current_password: form.current_password };
            if (form.new_username) payload.new_username = form.new_username;
            if (form.new_password) payload.new_password = form.new_password;
            if (form.new_name) payload.new_name = form.new_name;
            await adminApi.changeCredentials(payload);
            toast.success("Bilgileriniz güncellendi! Lütfen yeni bilgilerle giriş yapın.");
            setTimeout(() => {
                clearToken();
                navigate("/admin");
            }, 1800);
        } catch (e) {
            toast.error(e?.response?.data?.detail || "Güncellenemedi");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-2xl" data-testid="admin-account">
            <div>
                <div className="overline">Hesap</div>
                <h1 className="font-display text-5xl uppercase mt-1">Hesap Ayarları</h1>
                <p className="text-sm text-neutral-400 mt-2">Kullanıcı adınızı, şifrenizi ve görüntülenen adınızı buradan değiştirebilirsiniz.</p>
            </div>

            <div className="bg-liv-card border border-liv-border p-6">
                <div className="flex items-center gap-4 pb-4 mb-4 border-b border-liv-border">
                    <div className="w-14 h-14 bg-liv-yellow text-black flex items-center justify-center font-display text-2xl">
                        {(user?.name || "A")[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="font-display text-2xl uppercase">{user?.name}</div>
                        <div className="text-sm text-neutral-400">{user?.email}</div>
                        <div className="text-[10px] uppercase tracking-widest text-liv-yellow mt-1">{user?.role}</div>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <div className="bg-yellow-900/20 border border-liv-yellow/40 text-liv-yellow text-sm p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>Sadece değiştirmek istediğiniz alanları doldurun. Mevcut şifrenizi onay için her zaman girmelisiniz.</div>
                    </div>

                    <div>
                        <label className="liv-label flex items-center gap-2"><UserIcon className="w-3 h-3" /> Yeni Kullanıcı Adı</label>
                        <input value={form.new_username} onChange={(e) => update("new_username", e.target.value)} className="liv-input" placeholder={user?.email} data-testid="account-new-username" />
                        <div className="text-xs text-neutral-500 mt-1">E-posta veya basit bir kullanıcı adı (örn: "livanespor", "ali"). Boş bırakırsanız değişmez.</div>
                    </div>

                    <div>
                        <label className="liv-label">Görüntülenen Ad</label>
                        <input value={form.new_name} onChange={(e) => update("new_name", e.target.value)} className="liv-input" placeholder={user?.name} data-testid="account-new-name" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="liv-label flex items-center gap-2"><KeyRound className="w-3 h-3" /> Yeni Şifre</label>
                            <input type="password" value={form.new_password} onChange={(e) => update("new_password", e.target.value)} className="liv-input" placeholder="En az 6 karakter" data-testid="account-new-password" autoComplete="new-password" />
                        </div>
                        <div>
                            <label className="liv-label">Yeni Şifre Tekrarı</label>
                            <input type="password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} className="liv-input" placeholder="Yeni şifreyi tekrar girin" data-testid="account-confirm-password" autoComplete="new-password" />
                        </div>
                    </div>

                    <div className="border-t border-liv-border pt-5">
                        <label className="liv-label text-liv-yellow">Mevcut Şifre (onay için zorunlu) *</label>
                        <input type="password" required value={form.current_password} onChange={(e) => update("current_password", e.target.value)} className="liv-input" placeholder="Mevcut şifrenizi girin" data-testid="account-current-password" autoComplete="current-password" />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button disabled={loading} type="submit" className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="account-save">
                            <Save className="w-4 h-4" /> {loading ? "Kaydediliyor..." : "Bilgileri Güncelle"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="text-xs text-neutral-500">
                💡 İpucu: Kullanıcı adınızı değiştirseniz bile, tarayıcı şifre yöneticileri otomatik olarak yeni bilgileri kaydedecektir. Kaydettikten sonra sistem sizi otomatik çıkış yapacak — yeni bilgilerinizle tekrar giriş yapın.
            </div>
        </div>
    );
};

export default Account;
