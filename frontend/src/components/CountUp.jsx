import { useEffect, useState, useRef } from "react";

export const CountUp = ({ end = 0, duration = 1500, suffix = "" }) => {
    const [value, setValue] = useState(0);
    const ref = useRef(null);
    const startedRef = useRef(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting && !startedRef.current) {
                        startedRef.current = true;
                        const start = performance.now();
                        const tick = (t) => {
                            const elapsed = t - start;
                            const p = Math.min(elapsed / duration, 1);
                            const eased = 1 - Math.pow(1 - p, 3);
                            setValue(Math.floor(eased * end));
                            if (p < 1) requestAnimationFrame(tick);
                            else setValue(end);
                        };
                        requestAnimationFrame(tick);
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.5 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{value}{suffix}</span>;
};

export const Countdown = ({ targetIso }) => {
    const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });
    useEffect(() => {
        if (!targetIso) return;
        const target = new Date(targetIso).getTime();
        const update = () => {
            const diff = Math.max(0, target - Date.now());
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / (1000 * 60)) % 60);
            const s = Math.floor((diff / 1000) % 60);
            setT({ d, h, m, s });
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, [targetIso]);
    if (!targetIso) return null;
    return (
        <div className="flex gap-3 md:gap-5" data-testid="match-countdown">
            {[
                { l: "Gün", v: t.d },
                { l: "Saat", v: t.h },
                { l: "Dak", v: t.m },
                { l: "Sn", v: t.s },
            ].map((u, i) => (
                <div key={i} className="text-center">
                    <div className="font-display text-4xl md:text-6xl text-liv-yellow leading-none tabular-nums">
                        {String(u.v).padStart(2, "0")}
                    </div>
                    <div className="text-[10px] md:text-xs text-neutral-400 tracking-widest uppercase mt-1">{u.l}</div>
                </div>
            ))}
        </div>
    );
};
