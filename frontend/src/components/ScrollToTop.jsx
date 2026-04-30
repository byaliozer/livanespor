import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls window to top whenever the route pathname changes.
 * Mount once near the top of the router tree.
 */
export default function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname]);
    return null;
}
