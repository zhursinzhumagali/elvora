
"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

type Language = "ru" | "en";

type LanguageContextType = {
    language: Language;
    setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [language, setLanguageState] = useState<Language>("ru");
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("elvora-language");

        if (saved === "ru" || saved === "en") {
            setLanguageState(saved);
        }

        setReady(true);
    }, []);

    function setLanguage(nextLanguage: Language) {
        setLanguageState(nextLanguage);
        localStorage.setItem("elvora-language", nextLanguage);
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage }}>
            <div lang={ready ? language : "ru"}>{children}</div>
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error(
            "useLanguage должен использоваться внутри LanguageProvider"
        );
    }

    return context;
}
