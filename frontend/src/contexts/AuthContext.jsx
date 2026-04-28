import { createContext, useContext, useState, useEffect } from "react";
import { adminApi, getToken, setToken, clearToken } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = getToken();
        if (!t) { setLoading(false); return; }
        adminApi.me()
            .then((u) => setUser(u))
            .catch(() => clearToken())
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await adminApi.login(email, password);
        setToken(res.token);
        setUser(res.user);
        return res.user;
    };

    const logout = () => { clearToken(); setUser(null); };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
