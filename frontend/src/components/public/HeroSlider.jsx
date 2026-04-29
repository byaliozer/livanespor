import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_401d88f4-8dae-48a8-9716-45cb5be0ec5c/artifacts/4x1k75zi_Livanespor_SARI_SIYAH_NEW%20genelde%20bu.png";

export const HeroSlider = ({ slides = [], loading = false }) => {
    const [idx, setIdx] = useState(0);
    const total = slides.length || 1;

    useEffect(() => {
        if (!slides.length) return;
        const id = setInterval(() => setIdx((i) => (i + 1) % total), 6500);
        return () => clearInterval(id);
    }, [total, slides.length]);

    // Loading state — show branded skeleton instead of empty
    if (loading || !slides.length) {
        return (
            <section className="relative h-[88vh] md:h-screen bg-liv-black overflow-hidden flex items-center justify-center" data-testid="hero-loading">
                <div className="absolute inset-0 diag-accent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
                <div className="relative text-center animate-fade-in">
                    <img src={LOGO_URL} alt="Livanespor" className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 animate-pulse-yellow" />
                    <div className="font-display text-5xl md:text-8xl text-white/90 tracking-wider">LİVANESPOR</div>
                    <div className="mt-4 text-xs md:text-sm uppercase tracking-[0.4em] text-liv-yellow/70">Yükleniyor...</div>
                </div>
            </section>
        );
    }

    const cur = slides[idx];
    return (
        <section className="relative h-[88vh] md:h-screen overflow-hidden bg-black" data-testid="hero-slider">
            {slides.map((s, i) => (
                <div
                    key={s.id || i}
                    className={`absolute inset-0 transition-opacity duration-1000 ${i === idx ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                >
                    <img
                        src={s.image_url}
                        alt={s.title}
                        loading={i === 0 ? "eager" : "lazy"}
                        fetchpriority={i === 0 ? "high" : "auto"}
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover scale-105"
                        style={{ transform: i === idx ? "scale(1.0)" : "scale(1.08)", transition: "transform 9s ease-out" }}
                    />
                    <div className="absolute inset-0 hero-overlay" />
                </div>
            ))}

            <div className="relative h-full container-x flex flex-col justify-end pb-20 md:pb-32">
                <div className="max-w-4xl animate-fade-up">
                    <div className="overline mb-3" data-testid="hero-overline">{cur.subtitle || "Livanespor"}</div>
                    <h1 className="font-display text-5xl sm:text-7xl lg:text-9xl leading-[0.9] uppercase text-white" data-testid="hero-title">
                        {cur.title}
                    </h1>
                    {cur.description && (
                        <p className="mt-5 max-w-2xl text-base md:text-lg text-neutral-200 leading-relaxed" data-testid="hero-description">
                            {cur.description}
                        </p>
                    )}
                    <div className="mt-8 flex flex-wrap gap-4">
                        {cur.cta_primary_label && (
                            <Link to={cur.cta_primary_link || "/"} className="btn-primary" data-testid="hero-cta-primary">
                                {cur.cta_primary_label}
                            </Link>
                        )}
                        {cur.cta_secondary_label && (
                            <Link to={cur.cta_secondary_link || "/"} className="btn-secondary" data-testid="hero-cta-secondary">
                                {cur.cta_secondary_label}
                            </Link>
                        )}
                    </div>
                </div>

                <div className="absolute bottom-8 right-4 md:right-8 flex items-center gap-3">
                    <button onClick={() => setIdx((i) => (i - 1 + total) % total)} className="w-10 h-10 border border-white/30 hover:border-liv-yellow hover:text-liv-yellow flex items-center justify-center" data-testid="hero-prev">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="font-mono text-sm text-white/80 tabular-nums">
                        {String(idx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
                    </div>
                    <button onClick={() => setIdx((i) => (i + 1) % total)} className="w-10 h-10 border border-white/30 hover:border-liv-yellow hover:text-liv-yellow flex items-center justify-center" data-testid="hero-next">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <div className="absolute bottom-8 left-4 md:left-8 flex gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setIdx(i)}
                            className={`h-1 transition-all ${i === idx ? "w-12 bg-liv-yellow" : "w-6 bg-white/30"}`}
                            data-testid={`hero-dot-${i}`}
                            aria-label={`Slide ${i + 1}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
