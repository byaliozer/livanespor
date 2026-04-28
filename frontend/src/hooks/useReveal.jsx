import { useEffect, useRef } from "react";

export const useReveal = () => {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-visible");
                        obs.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return ref;
};

export const Reveal = ({ children, delay = 0, className = "" }) => {
    const ref = useReveal();
    return (
        <div ref={ref} className={`reveal-on-scroll ${className}`} style={{ transitionDelay: `${delay}ms` }}>
            {children}
        </div>
    );
};
