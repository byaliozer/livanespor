import { useEffect } from "react";

export const SEO = ({ title, description, image }) => {
    useEffect(() => {
        if (title) document.title = title;
        const setMeta = (name, content, attr = "name") => {
            if (!content) return;
            let el = document.querySelector(`meta[${attr}="${name}"]`);
            if (!el) {
                el = document.createElement("meta");
                el.setAttribute(attr, name);
                document.head.appendChild(el);
            }
            el.setAttribute("content", content);
        };
        setMeta("description", description);
        setMeta("og:title", title, "property");
        setMeta("og:description", description, "property");
        setMeta("og:image", image, "property");
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", title);
        setMeta("twitter:description", description);
    }, [title, description, image]);
    return null;
};
