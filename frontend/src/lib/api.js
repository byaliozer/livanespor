import axios from "axios";

/**
 * Smart backend URL resolver:
 * - If page is opened on the same origin as REACT_APP_BACKEND_URL (preview/dev), use that.
 * - If page is opened on a DIFFERENT origin (custom domain like livanespor.org),
 *   use the current origin so API calls hit the same domain (no SSL/CORS issues).
 */
const ENV_BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const CURRENT_ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

const BACKEND_URL = (() => {
    if (!ENV_BACKEND) return CURRENT_ORIGIN;
    try {
        const envHost = new URL(ENV_BACKEND).host;
        const curHost = new URL(CURRENT_ORIGIN).host;
        // If running on a different host than env backend (e.g. custom domain), use current origin
        return envHost === curHost ? ENV_BACKEND : CURRENT_ORIGIN;
    } catch {
        return CURRENT_ORIGIN;
    }
})();

export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "liv_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
    baseURL: API,
    timeout: 60000,
});

api.interceptors.request.use((config) => {
    const t = getToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    return config;
});

api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err?.response?.status === 401) {
            clearToken();
            // Avoid redirect loops
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin")) {
                // no-op
            } else if (window.location.pathname !== "/admin") {
                window.location.href = "/admin";
            }
        }
        return Promise.reject(err);
    }
);

// Public helpers
export const publicApi = {
    siteSettings: () => api.get("/public/site-settings").then((r) => r.data),
    heroSlides: () => api.get("/public/hero-slides").then((r) => r.data),
    players: (params = {}) => api.get("/public/players", { params }).then((r) => r.data),
    player: (slug) => api.get(`/public/players/${slug}`).then((r) => r.data),
    staff: (params = {}) => api.get("/public/staff", { params }).then((r) => r.data),
    matches: (params = {}) => api.get("/public/matches", { params }).then((r) => r.data),
    nextMatch: () => api.get("/public/matches/next").then((r) => r.data),
    lastMatch: () => api.get("/public/matches/last").then((r) => r.data),
    standings: (params = {}) => api.get("/public/standings", { params }).then((r) => r.data),
    sponsors: (params = {}) => api.get("/public/sponsors", { params }).then((r) => r.data),
    academyGroups: () => api.get("/public/academy/groups").then((r) => r.data),
    academySessions: () => api.get("/public/academy/sessions").then((r) => r.data),
    posts: (params = {}) => api.get("/public/posts", { params }).then((r) => r.data),
    post: (slug) => api.get(`/public/posts/${slug}`).then((r) => r.data),
    categories: () => api.get("/public/categories").then((r) => r.data),
    contact: (data) => api.post("/public/contact", data).then((r) => r.data),
    apply: (data) => api.post("/public/academy/apply", data).then((r) => r.data),
};

// Admin helpers
export const adminApi = {
    login: (email, password) => api.post("/auth/login", { email, password }).then((r) => r.data),
    me: () => api.get("/auth/me").then((r) => r.data),
    stats: () => api.get("/admin/dashboard/stats").then((r) => r.data),
    changeCredentials: (data) => api.post("/auth/change-credentials", data).then((r) => r.data),
    list: (coll) => api.get(`/admin/${coll}`).then((r) => r.data),
    get: (coll, id) => api.get(`/admin/${coll}/${id}`).then((r) => r.data),
    create: (coll, data) => api.post(`/admin/${coll}`, data).then((r) => r.data),
    update: (coll, id, data) => api.put(`/admin/${coll}/${id}`, data).then((r) => r.data),
    delete: (coll, id) => api.delete(`/admin/${coll}/${id}`).then((r) => r.data),
    settings: () => api.get("/admin/site-settings").then((r) => r.data),
    saveSettings: (data) => api.put("/admin/site-settings", data).then((r) => r.data),
    aiSettings: () => api.get("/admin/ai-settings").then((r) => r.data),
    saveAiSettings: (data) => api.put("/admin/ai-settings", data).then((r) => r.data),
    generateImage: (data) => api.post("/admin/ai/generate-image", data).then((r) => r.data),
    uploadMedia: (data) => api.post("/admin/media/upload", data).then((r) => r.data),
};
