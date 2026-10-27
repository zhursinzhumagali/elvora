
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/language-switcher";
import { useLanguage } from "@/components/language-provider";
import { translations } from "@/components/translations";

export default function LoginPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.replace("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setMessage(t.confirmEmail);
        }
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : t.genericError
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#10100f] px-5 py-8 text-[#f0eee9]">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="text-2xl font-semibold tracking-tight">
          elvora<span className="text-[#c4b5fd]">.</span>
        </a>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <a
            href="/"
            className="text-sm text-white/55 transition hover:text-white"
          >
            {t.home}
          </a>
        </div>
      </header>

      <section className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center py-12">
        <p className="mb-5 text-xs uppercase tracking-[0.3em] text-[#c4b5fd]">
          {t.yourNextChapter}
        </p>

        <h1 className="font-serif text-5xl leading-tight tracking-tight sm:text-6xl">
          {isLogin ? t.welcomeBack : t.beginJourney}
        </h1>

        <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
          {isLogin ? t.loginDescription : t.signupDescription}
        </p>

        <div className="mt-9 grid grid-cols-2 border-b border-white/15">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setMessage("");
            }}
            className={`border-b-2 py-3 text-sm transition ${isLogin
              ? "border-[#c4b5fd] text-white"
              : "border-transparent text-white/45 hover:text-white"
              }`}
          >
            {t.login}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setMessage("");
            }}
            className={`border-b-2 py-3 text-sm transition ${!isLogin
              ? "border-[#c4b5fd] text-white"
              : "border-transparent text-white/45 hover:text-white"
              }`}
          >
            {t.signup}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm text-white/70"
            >
              {t.email}
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full border border-white/15 bg-white/[0.03] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#c4b5fd]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm text-white/70"
            >
              {t.password}
            </label>

            <input
              id="password"
              type="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.passwordHint}
              minLength={6}
              required
              className="w-full border border-white/15 bg-white/[0.03] px-4 py-3.5 text-sm outline-none transition placeholder:text-white/25 focus:border-[#c4b5fd]"
            />
          </div>

          {message && (
            <p
              role="status"
              aria-live="polite"
              className="border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/75"
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c4b5fd] px-5 py-4 text-sm font-medium text-[#17131f] transition hover:bg-[#d3c8ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? t.wait
              : isLogin
                ? t.loginButton
                : t.signupButton}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-white/35">
          {t.loginFooter}
        </p>
      </section>
    </main>
  );
}
