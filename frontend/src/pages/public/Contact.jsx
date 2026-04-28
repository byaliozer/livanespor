import { useState } from "react";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { publicApi } from "@/lib/api";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
    const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
    const [loading, setLoading] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await publicApi.contact(form);
            toast.success("Mesajınız iletildi. En kısa sürede dönüş yapacağız.");
            setForm({ name: "", email: "", phone: "", subject: "", message: "" });
        } catch (err) {
            toast.error("Mesaj gönderilemedi: " + (err?.response?.data?.detail || err.message));
        } finally { setLoading(false); }
    };
    return (
        <PublicLayout>
            <SEO title="İletişim · Livanespor" description="Livanespor iletişim bilgileri, adres ve form." />
            <div className="container-x section-pad">
                <div className="overline">İletişim</div>
                <h1 className="font-display text-6xl md:text-8xl uppercase mt-2">Bize Ulaşın</h1>
                <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 space-y-4">
                        <div className="bg-liv-card border border-liv-border p-6"><MapPin className="w-6 h-6 text-liv-yellow" /><div className="overline mt-3">Adres</div><div className="font-display text-2xl mt-1">Yolçatı Tesisi</div><div className="text-neutral-300">Nilüfer / Bursa</div><a href="https://maps.app.goo.gl/NKoYnqsX9hdp5k2T8" target="_blank" rel="noreferrer" className="mt-3 inline-block text-liv-yellow text-sm font-bold hover:underline" data-testid="contact-map-link">Haritada Aç →</a></div>
                        <div className="bg-liv-card border border-liv-border p-6"><Phone className="w-6 h-6 text-liv-yellow" /><div className="overline mt-3">Telefon</div><a href="tel:05437934101" className="font-display text-2xl mt-1 block hover:text-liv-yellow">0543 793 4101</a></div>
                        <div className="bg-liv-card border border-liv-border p-6"><Mail className="w-6 h-6 text-liv-yellow" /><div className="overline mt-3">E-posta</div><a href="mailto:bilgi@livanespor.org" className="font-display text-2xl mt-1 block hover:text-liv-yellow">bilgi@livanespor.org</a></div>
                    </div>
                    <form onSubmit={submit} className="lg:col-span-7 bg-liv-card border border-liv-border p-8" data-testid="contact-form">
                        <h2 className="font-display text-3xl uppercase mb-6">Mesaj Gönder</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="liv-label">Ad Soyad</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="liv-input" data-testid="contact-name" /></div>
                            <div><label className="liv-label">E-posta</label><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="liv-input" data-testid="contact-email" /></div>
                            <div><label className="liv-label">Telefon</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="liv-input" data-testid="contact-phone" /></div>
                            <div><label className="liv-label">Konu</label><input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="liv-input" data-testid="contact-subject" /></div>
                        </div>
                        <div className="mt-4"><label className="liv-label">Mesajınız</label><textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="liv-input" data-testid="contact-message" /></div>
                        <button disabled={loading} type="submit" className="btn-primary mt-6 inline-flex items-center gap-2 disabled:opacity-50" data-testid="contact-submit">
                            <Send className="w-4 h-4" /> {loading ? "Gönderiliyor..." : "Gönder"}
                        </button>
                    </form>
                </div>
            </div>
        </PublicLayout>
    );
};
export default Contact;
