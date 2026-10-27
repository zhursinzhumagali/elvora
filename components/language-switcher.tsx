
"use client";

import { useLanguage } from "./language-provider";

export default function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    return (
        <div
            className="inline-flex items-center gap-1 border border-white/10 bg-white/[0.03] p-1"
            aria-label="Выбор языка / Language selection"
        >
            {(["ru", "en"] as const).map((item) => (
                <button
                    key={item}
                    type="button"
                    onClick={() => setLanguage(item)}
                    aria-pressed={language === item}
                    className={`px-3 py-1.5 text-xs font-medium transition ${language === item
                        ? "bg-[#c4b5fd] text-[#17131f]"
                        : "text-white/55 hover:text-white"
                        }`}
                >
                    {item.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
