// Türkçe tarih formatı: DD.MM.YYYY
// Tüm panel ve AI prompt'larda bu format kullanılır.

export const formatDateTR = (input) => {
    if (!input) return "";
    const s = String(input).trim();
    // YYYY-MM-DD veya ISO datetime → 10 karakter al
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
    }
    // Zaten DD.MM.YYYY ise olduğu gibi döndür
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(s)) return s;
    // Date object'e parse edilebiliyorsa fallback
    const d = new Date(s);
    if (!isNaN(d)) {
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        return `${dd}.${mm}.${d.getFullYear()}`;
    }
    return s;
};

// Saat formatı: HH:MM
export const formatTimeTR = (input) => {
    if (!input) return "";
    const s = String(input);
    // ISO datetime'dan saat
    const m = s.match(/T(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
    // Zaten HH:MM
    if (/^\d{2}:\d{2}$/.test(s)) return s;
    return s;
};

// DD.MM.YYYY → YYYY-MM-DD (datetime-local input için)
export const trToIso = (s) => {
    const m = String(s || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
};
