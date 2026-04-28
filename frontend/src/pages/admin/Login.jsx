import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogIn, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png";

const AdminLogin = () => {
    const { user, loading: authLoading, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    useEffect(() => { if (user) navigate("/admin/dashboard", { replace: true }); }, [user, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        setErr(""); setLoading(true);
        try {
            await login(email, password);
            toast.success("Giriş başarılı");
            navigate("/admin/dashboard");
        } catch (e2) {
            const msg = e2?.response?.data?.detail || "Giriş başarısız";
            setErr(msg);
            toast.error(msg);
        } finally { setLoading(false); }
    };

    if (authLoading) return <div className="min-h-screen bg-liv-black flex items-center justify-center text-neutral-400">Yükleniyor…</div>;

    return (
        <div className="min-h-screen bg-liv-black text-white grid grid-cols-1 md:grid-cols-2" data-testid="admin-login-page">
            <div className="hidden md:flex relative items-end p-12 bg-liv-yellow text-black overflow-hidden">
                <div className="absolute top-0 right-0 font-display text-[28vw] leading-none text-black/5 select-none">LV</div>
                <div className="relative z-10">
                    <img src={LOGO_URL} alt="Livanespor" className="w-20 h-20" />
                    <div className="font-display text-[12vw] leading-[0.85] uppercase mt-6">LİVANES<br/>PORr</div>
                    <div className="mt-4 text-sm font-bold uppercase tracking-[0.3em]">Admin Panel · 2026</div>
                </div>
            </div>
            <div className="flex items-center justify-center p-8">
                <form onSubmit={submit} className="w-full max-w-sm">
                    <img src={LOGO_URL} alt="Livanespor" className="w-14 h-14 md:hidden mb-6" />
                    <div className="overline">Yönetim</div>
                    <h1 className="font-display text-5xl uppercase mt-2">Giriş Yap</h1>
                    <p className="text-sm text-neutral-400 mt-2">Livanespor admin paneline erişmek için kimlik bilgilerinizi girin.</p>
                    {err && <div className="mt-4 p-3 border border-red-700 bg-red-950/40 text-red-300 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}
                    <div className="mt-6">
                        <label className="liv-label">E-posta</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="liv-input" required data-testid="admin-login-email" />
                    </div>
                    <div className="mt-4">
                        <label className="liv-label">Şifre</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="liv-input" required data-testid="admin-login-password" />
                    </div>
                    <button disabled={loading} type="submit" className="btn-primary w-full mt-6 inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="admin-login-submit">
                        <LogIn className="w-4 h-4" /> {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </button>
                    <div className="mt-6 text-xs text-neutral-500 border-t border-liv-border pt-4">
                        Demo: <span className="text-liv-yellow">admin@livanespor.org</span> / <span className="text-liv-yellow">Livanespor2026!</span>
                    </div>
                </form>
            </div>
        </div>
    );
};
export default AdminLogin;
