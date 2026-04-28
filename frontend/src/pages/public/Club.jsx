import { PublicLayout } from "@/components/public/PublicLayout";
import { SEO } from "@/components/SEO";
import { Reveal } from "@/hooks/useReveal";
import { Trophy, Target, Users, Heart } from "lucide-react";

const Club = () => {
    return (
        <PublicLayout>
            <SEO title="Kulüp · Livanespor" description="Livanespor hakkında: tarihçe, vizyon, misyon, değerler, yönetim ve tesisler." />
            <div className="container-x section-pad">
                <Reveal>
                    <div className="overline">Kulüp</div>
                    <h1 className="font-display text-5xl md:text-8xl uppercase mt-2">Hakkımızda</h1>
                    <p className="mt-6 text-lg md:text-xl text-neutral-300 max-w-3xl leading-relaxed">
                        Livanespor, Bursa Nilüfer'de futbolun ve toplumun gelişimine katkı sağlamayı hedefleyen bir kulüptür. A takımdan akademiye uzanan bütüncül bir yapı ile gençlere fırsat ve disiplin sunuyoruz.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16">
                    {[
                        { icon: Trophy, title: "Vizyon", text: "Bursa'nın gururu olan, ulusal arenada söz sahibi bir kulüp olmak." },
                        { icon: Target, title: "Misyon", text: "Genç oyuncuları profesyonelliğe hazırlamak, kulüp kültürünü topluma yaymak." },
                        { icon: Users, title: "Değerler", text: "Disiplin, dayanışma, dürüstlük, takım ruhu, sürekli gelişim." },
                        { icon: Heart, title: "Topluluk", text: "Taraftarımız, velilerimiz ve sponsorlarımızla büyüyen Livane ailesi." },
                    ].map(({ icon: Icon, title, text }, i) => (
                        <Reveal key={i} delay={i * 80}>
                            <div className="bg-liv-card border border-liv-border p-8 md:p-10 h-full">
                                <Icon className="w-8 h-8 text-liv-yellow" />
                                <h3 className="font-display text-3xl md:text-4xl uppercase mt-4">{title}</h3>
                                <p className="mt-3 text-neutral-400 leading-relaxed">{text}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>

                <Reveal>
                    <div className="mt-16 bg-gradient-to-br from-liv-yellow to-yellow-500 text-black p-10 md:p-16 relative overflow-hidden">
                        <div className="absolute top-0 right-0 font-display text-[20vw] leading-none text-black/5 select-none">2026</div>
                        <div className="relative">
                            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-3">Tarihçe</div>
                            <h3 className="font-display text-5xl md:text-7xl uppercase leading-none">SARI-SİYAHIN HİKAYESİ</h3>
                            <p className="mt-6 max-w-3xl text-base md:text-lg leading-relaxed">
                                Livanespor, Bursa Nilüfer'in Yolçatı bölgesinde kurulan bir gönül kulübü olarak yola çıktı. Kısa sürede genç ve yetenekli oyuncuları bünyesine katarak hem A Takım hem de Akademi yapısıyla bölgesinin önemli kulüplerinden biri haline geldi.
                            </p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </PublicLayout>
    );
};
export default Club;
