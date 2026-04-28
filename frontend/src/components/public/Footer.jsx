import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png";

export const Footer = () => {
    return (
        <footer className="bg-black border-t border-white/10 mt-20" data-testid="public-footer">
            <div className="container-x py-16">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                    <div className="md:col-span-5">
                        <Link to="/" className="flex items-center gap-3">
                            <img src={LOGO_URL} alt="Livanespor" className="h-14 w-14" />
                            <span className="font-display text-3xl">LİVANESPOR</span>
                        </Link>
                        <p className="text-neutral-400 mt-4 max-w-md leading-relaxed">
                            Bursa Nilüfer'in resmi futbol kulübü. A takımdan akademiye, gelişim, disiplin ve takım ruhuyla yol alıyoruz.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <a
                                href="https://www.instagram.com/livanesporkulubu/"
                                target="_blank"
                                rel="noreferrer noopener"
                                aria-label="Livanespor Instagram"
                                className="inline-flex items-center gap-2 px-4 h-10 border border-white/15 hover:border-liv-yellow hover:text-liv-yellow transition-colors"
                                data-testid="footer-social-instagram"
                            >
                                <Instagram className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-widest">Instagram</span>
                            </a>
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="overline mb-4">Kulüp</div>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/kulup" className="text-neutral-300 hover:text-liv-yellow">Hakkımızda</Link></li>
                            <li><Link to="/takim" className="text-neutral-300 hover:text-liv-yellow">A Takım</Link></li>
                            <li><Link to="/oyuncular" className="text-neutral-300 hover:text-liv-yellow">Oyuncular</Link></li>
                            <li><Link to="/teknik-ekip" className="text-neutral-300 hover:text-liv-yellow">Teknik Ekip</Link></li>
                            <li><Link to="/fikstur" className="text-neutral-300 hover:text-liv-yellow">Fikstür</Link></li>
                            <li><Link to="/puan-durumu" className="text-neutral-300 hover:text-liv-yellow">Puan Durumu</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <div className="overline mb-4">Akademi</div>
                        <ul className="space-y-2 text-sm">
                            <li><Link to="/akademi" className="text-neutral-300 hover:text-liv-yellow">Akademi</Link></li>
                            <li><Link to="/akademi/yas-gruplari" className="text-neutral-300 hover:text-liv-yellow">Yaş Grupları</Link></li>
                            <li><Link to="/akademi/antrenman-takvimi" className="text-neutral-300 hover:text-liv-yellow">Takvim</Link></li>
                            <li><Link to="/akademi/teknik-kadro" className="text-neutral-300 hover:text-liv-yellow">Teknik Kadro</Link></li>
                            <li><Link to="/akademi/basvuru" className="text-liv-yellow font-semibold hover:underline">Başvuru</Link></li>
                        </ul>
                    </div>

                    <div className="md:col-span-2">
                        <div className="overline mb-4">İletişim</div>
                        <ul className="space-y-3 text-sm text-neutral-300">
                            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-liv-yellow mt-0.5 shrink-0" /> Yolçatı, Nilüfer / Bursa</li>
                            <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-liv-yellow shrink-0" /><a href="tel:05437934101" className="hover:text-liv-yellow">0543 793 4101</a></li>
                            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-liv-yellow shrink-0" /><a href="mailto:bilgi@livanespor.org" className="hover:text-liv-yellow">bilgi@livanespor.org</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Massive type strip */}
            <div className="border-t border-white/10 overflow-hidden">
                <div className="container-x py-8">
                    <div className="font-display text-[18vw] md:text-[14vw] leading-[0.9] text-white/[0.04] select-none whitespace-nowrap">
                        LİVANESPOR · 2026
                    </div>
                </div>
            </div>

            <div className="border-t border-white/10">
                <div className="container-x py-5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
                    <div>© {new Date().getFullYear()} Livanespor. Tüm hakları saklıdır.</div>
                    <div className="flex gap-4">
                        <a href="#" className="hover:text-liv-yellow">Gizlilik</a>
                        <a href="#" className="hover:text-liv-yellow">KVKK</a>
                        <a href="#" className="hover:text-liv-yellow">Çerezler</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
