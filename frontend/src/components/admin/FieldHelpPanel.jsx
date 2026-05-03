import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";

// Bu sözlük, AI Stüdyo'da her şablon için "girilen alan görselin neresine gidiyor"
// rehberini gösterir. Yeni şablon eklenince buraya da ekleyin.
const FIELD_HELP = {
    match_week: [
        ["Maç Seç", "Otomatik doldurur — ev/dep takım, tarih, saat, stat, lig"],
        ["Ev Sahibi / Deplasman", "Crest altında uppercase isim olarak yazılır"],
        ["Tarih · Saat · Stat", "Üst info-strip'te tek satır"],
        ["Lig", "Heading üstü ufak overline"],
        ["Ev/Dep Logo (yükle)", "1. ve 2. referans → SOL / SAĞ crest"],
    ],
    match_day: [
        ["Maç Seç", "Otomatik doldurur — ev/dep takım, tarih, saat, stat, lig"],
        ["Ev Sahibi / Deplasman", "Crest altında uppercase isim olarak yazılır"],
        ["Tarih · Saat · Stat", "Üst info-strip'te tek satır"],
        ["Lig", "Heading üstü ufak overline"],
        ["Ev/Dep Logo (yükle)", "1. ve 2. referans → SOL / SAĞ crest"],
        ["Ek Mesaj", "Heading altı çağrı (opsiyonel)"],
    ],
    lineup: [
        ["Dizilim (4-3-3 vb.)", "Saha şemasının üst başlığı"],
        ["İlk 11 Oyuncular", "Saha üzerinde ilgili pozisyona forma no + soyad"],
        ["Maç Bilgileri", "Üst başlığın altında rakip + tarih + saat"],
        ["Kulüp Crest (yükle)", "1. referans → sol üst köşe"],
    ],
    full_time: [
        ["Maç Seç", "Otomatik — ev/dep + skor + tarih + stat"],
        ["Ev/Dep Skor", "Ortada giant skor"],
        ["Gol atanlar", "Skor altında 2 kolon panel (opsiyonel)"],
        ["Ev/Dep Logo (yükle)", "1. ve 2. referans → SOL / SAĞ crest"],
        ["Takım Fotoğrafı (opsiyonel)", "3. referans → arka plan"],
    ],
    motm: [
        ["Oyuncu", "Otomatik — isim + forma no + pozisyon"],
        ["Oyuncu Fotoğrafı (yükle)", "1. referans → ortada büyük portre"],
        ["Maç Bilgileri (opsiyonel)", "Alt info-strip'te rakip"],
        ["Kulüp Crest (yükle)", "2. referans → küçük köşe rozeti"],
    ],
    birthday: [
        ["Oyuncu", "Otomatik — isim + yaş hesabı"],
        ["Oyuncu Fotoğrafı (yükle)", "1. referans → ortada portre"],
        ["Yaş", "Büyük şerit rakam"],
        ["Mesaj", "Portrenin altında kutlama metni"],
        ["Kulüp Crest (yükle)", "2. referans → köşe rozeti"],
    ],
    special_day: [
        ["Başlık", "Üst başlık (örn: 19 MAYIS)"],
        ["Mesaj Metni", "Hero alanında 2-3 satır mesaj"],
        ["Tarih", "Üst köşe etiket (opsiyonel)"],
        ["Kulüp Crest (yükle)", "1. referans → köşe rozeti"],
    ],
    new_transfer: [
        ["Oyuncu", "Otomatik — isim + pozisyon"],
        ["Önceki Kulüp", "Alt şerit (opsiyonel)"],
        ["Oyuncu Fotoğrafı (yükle)", "1. referans → ortada portre"],
        ["Kulüp Crest (yükle)", "2. referans → köşe rozeti"],
    ],
    fan_invite: [
        ["Maç Seç (otomatik) veya Elle gir", "Ev sahibi + deplasman takım isimleri"],
        ["Ev/Dep Logo (yükle — ZORUNLU)", "1. referans = SOL crest, 2. referans = SAĞ crest"],
        ["Tarih · Gün · Saat · Stat", "Üst info-strip — tek satır (örn: PAZAR · 16:00 · YOLÇATI TESİSLERİ)"],
        ["Lig / Maç Tipi", "Heading üstü ufak overline"],
        ["Vurgu Mesajı (opsiyonel)", "Crest'lerin altında brush-script vurgu metni — 1-2 satır"],
    ],
};

export const FieldHelpPanel = ({ templateKey }) => {
    const [open, setOpen] = useState(false);
    const items = FIELD_HELP[templateKey];
    if (!items || items.length === 0) return null;
    return (
        <div className="rounded-md border border-liv-yellow/30 bg-liv-yellow/[0.04] overflow-hidden" data-testid="field-help-panel">
            <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-liv-yellow hover:bg-liv-yellow/10" data-testid="field-help-toggle">
                <span className="inline-flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Alanlar görselin neresine gidiyor?
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <div className="px-3 py-3 border-t border-liv-yellow/20">
                    <table className="w-full text-xs">
                        <thead><tr className="text-neutral-500 uppercase tracking-wider"><th className="text-left py-1 pr-3 font-medium w-1/3">Alan</th><th className="text-left py-1 font-medium">Görselde Konum</th></tr></thead>
                        <tbody>
                            {items.map(([field, where]) => (
                                <tr key={field} className="border-t border-liv-border/40">
                                    <td className="py-1.5 pr-3 text-neutral-300 font-medium">{field}</td>
                                    <td className="py-1.5 text-neutral-400">{where}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-3 text-[11px] text-neutral-500 italic">
                        AI bu alanları HARFİYEN kullanır — yeniden ifade etmez. Kulüp ismini stadyum/şehir/bölge adından türetmez.
                    </p>
                </div>
            )}
        </div>
    );
};
