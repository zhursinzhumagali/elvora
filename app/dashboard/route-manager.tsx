
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LanguageSwitcher from "@/components/language-switcher";
import { translations } from "@/components/translations";
import { useLanguage } from "@/components/language-provider";

type Resource = {
  title: string;
  url: string;
  reason: string;
};

type GeneratedStep = {
  title: string;
  explanation: string;
  task: string;
  success_criteria: string;
  estimated_minutes: number;
  resources: Resource[];
};

type GeneratedStage = {
  title: string;
  objective: string;
  steps: GeneratedStep[];
};

type GeneratedRoute = {
  title: string;
  summary: string;
  estimated_weeks: number;
  stages: GeneratedStage[];
};

type SavedStep = {
  difficulty_rating: number | null;
  feedback_note: string | null;
  id: string;
  route_id: string;
  title: string;
  stage_title: string | null;
  stage_objective: string | null;
  explanation: string | null;
  task: string | null;
  success_criteria: string | null;
  estimated_minutes: number | null;
  resources: Resource[];
  resource_url: string | null;
  position: number;
  is_completed: boolean;
};

type SavedRoute = {
  id: string;
  title: string;
  goal: string;
  summary: string | null;
  estimated_weeks: number | null;
  created_at: string;
  steps: SavedStep[];
};

export default function RouteManager() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language];
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("beginner");
  const [hours, setHours] = useState("5");
  const [generated, setGenerated] = useState<GeneratedRoute | null>(null);
  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [adapted, setAdapted] = useState<GeneratedRoute | null>(null);
  const [adaptingRouteId, setAdaptingRouteId] = useState<string | null>(null);
  const [adaptedForRouteId, setAdaptedForRouteId] = useState<string | null>(null);
  const [applyingAdaptation, setApplyingAdaptation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadRoutes = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("routes")
      .select(
        "id, title, goal, summary, estimated_weeks, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Не удалось загрузить маршруты: ${error.message}`);
      setLoading(false);
      return;
    }

    const saved = data ?? [];

    if (saved.length === 0) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    const { data: steps, error: stepsError } = await supabase
      .from("route_steps")
      .select(
        "id, route_id, title, stage_title, stage_objective, explanation, task, success_criteria, estimated_minutes, resources, resource_url, position, is_completed, difficulty_rating, feedback_note"
      )
      .in("route_id", saved.map((route) => route.id))
      .order("position", { ascending: true });

    if (stepsError) {
      setMessage(`Не удалось загрузить шаги: ${stepsError.message}`);
      setLoading(false);
      return;
    }

    setRoutes(
      saved.map((route) => ({
        ...route,
        steps: (steps ?? []).filter(
          (step) => step.route_id === route.id
        ) as SavedStep[],
      }))
    );

    setLoading(false);
  }, [router]);

  useEffect(() => {
    void loadRoutes();
  }, [loadRoutes]);

  async function generateRoute(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setGenerated(null);
    setGenerating(true);

    try {
      const response = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          level,
          hoursPerWeek: Number(hours),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Не удалось создать маршрут.");
      }

      setGenerated(result.route);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Произошла ошибка при генерации."
      );
    } finally {
      setGenerating(false);
    }
  }

  async function adaptRoute(route: SavedRoute) {
    setMessage("");
    setAdapted(null);
    setAdaptingRouteId(route.id);

    try {
      const response = await fetch("/api/routes/adapt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Не удалось адаптировать маршрут.");
      }

      setAdapted(result.route);
      setAdaptedForRouteId(route.id);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка при адаптации маршрута."
      );
    } finally {
      setAdaptingRouteId(null);
    }
  }

  async function applyAdaptation() {
    if (!adapted || !adaptedForRouteId || applyingAdaptation) return;

    const confirmed = window.confirm(
      "Применить новый план? Выполненные шаги и отзывы останутся сохранены."
    );

    if (!confirmed) return;

    setApplyingAdaptation(true);
    setMessage("");

    try {
      const response = await fetch("/api/routes/apply-adaptation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeId: adaptedForRouteId,
          adaptedRoute: adapted,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Не удалось применить адаптацию."
        );
      }

      setAdapted(null);
      setAdaptedForRouteId(null);
      setMessage("Адаптация применена. Выполненные шаги сохранены.");

      await loadRoutes();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ошибка при применении адаптации."
      );
    } finally {
      setApplyingAdaptation(false);
    }
  }

  async function saveRoute() {
    if (!generated) return;

    setMessage("");
    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: newRoute, error: routeError } = await supabase
        .from("routes")
        .insert({
          user_id: user.id,
          title: generated.title,
          goal: goal.trim(),
          summary: generated.summary,
          user_level: level,
          hours_per_week: Number(hours),
          estimated_weeks: generated.estimated_weeks,
        })
        .select("id")
        .single();

      if (routeError) throw routeError;

      const rows = generated.stages.flatMap((stage) =>
        stage.steps.map((step) => ({
          route_id: newRoute.id,
          user_id: user.id,
          title: step.title,
          stage_title: stage.title,
          stage_objective: stage.objective,
          explanation: step.explanation,
          task: step.task,
          success_criteria: step.success_criteria,
          estimated_minutes: step.estimated_minutes,
          resources: step.resources,
          resource_url: step.resources[0]?.url || null,
          position: 0,
        }))
      );

      rows.forEach((row, index) => {
        row.position = index;
      });

      const { error: stepsError } = await supabase
        .from("route_steps")
        .insert(rows);

      if (stepsError) {
        await supabase.from("routes").delete().eq("id", newRoute.id);
        throw stepsError;
      }

      setGenerated(null);
      setGoal("");
      setMessage("Твой маршрут сохранён.");
      await loadRoutes();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Не удалось сохранить маршрут: ${error.message}`
          : "Не удалось сохранить маршрут."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStep(step: SavedStep) {
    setMessage("");

    const supabase = createClient();
    const nextValue = !step.is_completed;

    const { error } = await supabase
      .from("route_steps")
      .update({
        is_completed: nextValue,
        completed_at: nextValue ? new Date().toISOString() : null,
      })
      .eq("id", step.id);

    if (error) {
      setMessage(`Не удалось обновить прогресс: ${error.message}`);
      return;
    }

    setRoutes((current) =>
      current.map((route) => ({
        ...route,
        steps: route.steps.map((item) =>
          item.id === step.id
            ? { ...item, is_completed: nextValue }
            : item
        ),
      }))
    );
  }

  async function saveStepFeedback(
    step: SavedStep,
    rating: number,
    note: string
  ) {
    const supabase = createClient();

    const { error } = await supabase
      .from("route_steps")
      .update({
        difficulty_rating: rating,
        feedback_note: note.trim() || null,
      })
      .eq("id", step.id);

    if (error) {
      setMessage(`Не удалось сохранить оценку: ${error.message}`);
      return;
    }

    setRoutes((current) =>
      current.map((route) => ({
        ...route,
        steps: route.steps.map((item) =>
          item.id === step.id
            ? {
              ...item,
              difficulty_rating: rating,
              feedback_note: note.trim() || null,
            }
            : item
        ),
      }))
    );

    setMessage("Оценка сложности сохранена.");
  }


  async function deleteRoute(route: SavedRoute) {
    const confirmed = window.confirm(
      `Удалить маршрут «${route.title}»? Это действие нельзя отменить.`
    );

    if (!confirmed) return;

    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("routes")
      .delete()
      .eq("id", route.id);

    if (error) {
      setMessage(`Не удалось удалить маршрут: ${error.message}`);
      return;
    }

    setRoutes((current) =>
      current.filter((item) => item.id !== route.id)
    );

    setMessage(`Маршрут «${route.title}» удалён.`);
  }

  async function signOut() {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(`Не удалось выйти: ${error.message}`);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  function renderStep(step: {
    title: string;
    explanation: string | null;
    task: string | null;
    success_criteria: string | null;
    estimated_minutes: number | null;
    resources: Resource[] | null;
    is_completed?: boolean;
    id?: string;
  }, interactive = false) {
    return (
      <div key={step.id ?? step.title} className="border-t border-white/[0.08] py-6 transition-colors duration-300 first:border-t-0">
        <div className="flex items-start gap-3">
          {interactive && step.id && (
            <input
              type="checkbox"
              checked={Boolean(step.is_completed)}
              onChange={() => {
                const saved = routes
                  .flatMap((route) => route.steps)
                  .find((item) => item.id === step.id);
                if (saved) void toggleStep(saved);
              }}
              aria-label={`Отметить шаг: ${step.title}`}
              className="mt-1 accent-[#c4b5fd]"
            />
          )}

          <div className="min-w-0 flex-1">
            <h4 className={`font-medium ${step.is_completed ? "text-white/40 line-through" : "text-white/90"
              }`}>
              {step.title}
            </h4>

            {step.estimated_minutes && (
              <p className="mt-1 text-xs text-white/40">
                Примерно {step.estimated_minutes} минут
              </p>
            )}

            {step.explanation && (
              <p className="mt-3 text-sm leading-6 text-white/65">
                {step.explanation}
              </p>
            )}

            {step.task && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-[#c4b5fd]">
                  Практика
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {step.task}
                </p>
              </div>
            )}

            {step.success_criteria && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-[#c4b5fd]">
                  Критерий выполнения
                </p>
                <p className="mt-1 text-sm leading-6 text-white/75">
                  {step.success_criteria}
                </p>
              </div>
            )}


            {interactive && step.id && step.is_completed && (() => {
              const savedStep = routes
                .flatMap((route) => route.steps)
                .find((item) => item.id === step.id);

              if (!savedStep) return null;

              return (
                <div className="mt-6 border-t border-white/10 pt-5">
                  <p className="text-xs uppercase tracking-wider text-[#c4b5fd]">
                    Насколько сложным был этот шаг?
                  </p>

                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() =>
                          void saveStepFeedback(
                            savedStep,
                            rating,
                            savedStep.feedback_note ?? ""
                          )
                        }

                        className={`flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-medium transition-all duration-300 ${savedStep.difficulty_rating === rating
                          ? "border-[#c4b5fd] bg-[#c4b5fd] text-[#17131f] shadow-[0_0_20px_rgba(196,181,253,0.2)]"
                          : "border-white/[0.1] bg-white/[0.02] text-white/60 hover:border-[#c4b5fd]/50 hover:bg-[#c4b5fd]/[0.08] hover:text-white"
                          }`}

                        aria-label={`Сложность ${rating} из 5`}
                        aria-pressed={savedStep.difficulty_rating === rating}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>

                  <label className="mt-4 block text-sm text-white/60">
                    Комментарий (необязательно)
                    <textarea
                      key={savedStep.id}
                      defaultValue={savedStep.feedback_note ?? ""}
                      onBlur={(event) => {
                        const note = event.target.value;

                        if (note !== (savedStep.feedback_note ?? "")) {
                          if (savedStep.difficulty_rating !== null) {
                            void saveStepFeedback(
                              savedStep,
                              savedStep.difficulty_rating,
                              note
                            );
                          }
                        }
                      }}
                      placeholder="Например: не понял тему, нужна дополнительная практика..."
                      rows={2}

                      className="mt-2 w-full resize-y rounded-xl border border-white/[0.1] bg-white/[0.025] px-4 py-3 text-sm leading-6 text-white/80 placeholder:text-white/30 outline-none transition duration-300 focus:border-[#c4b5fd]/60 focus:bg-white/[0.04] focus:ring-4 focus:ring-[#c4b5fd]/[0.05]"

                    />
                  </label>
                </div>
              );
            })()}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6 pt-5">
        <a href="/" className="text-2xl font-semibold tracking-tight">
          elvora<span className="text-[#c4b5fd]">.</span>
        </a>


        <div className="flex items-center gap-5">
          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => router.push("/dashboard/progress")}
            className="text-sm text-[#c4b5fd] transition hover:text-white"
          >
            {t.myProgress} ↗
          </button>

          <button
            type="button"
            onClick={signOut}
            className="text-sm text-white/60 transition hover:text-white"
          >
            {t.logout}
          </button>
        </div>

      </header>


      <section className="relative isolate overflow-hidden py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 top-8 -z-10 h-64 w-64 rounded-full bg-[#c4b5fd]/[0.07] blur-[100px]"
        />
        <p className="text-xs uppercase tracking-[0.25em] text-[#c4b5fd]">
          {t.dashboardTitle}
        </p>
        <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.08] tracking-tight sm:text-7xl">
          {t.routeIntroTitle}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
          {t.routeIntroDescription}
        </p>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-white/[0.045] to-white/[0.01] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.18)] sm:p-10">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {t.aiRouteBuilder}
        </p>
        <h2 className="mt-4 font-serif text-3xl tracking-tight sm:text-4xl">
          {t.goalQuestion}
        </h2>

        <form onSubmit={generateRoute} className="mt-8 space-y-7">
          <div>
            <label htmlFor="goal" className="mb-2 block text-sm text-white/70">
              {t.goalPlaceholder}
            </label>
            <textarea
              id="goal"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Например: хочу освоить Python Backend, создавать API и подготовиться к первой работе..."
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full rounded-xl border border-white/[0.1] bg-black/20 px-4 py-4 text-sm leading-7 text-white placeholder:text-white/30 outline-none transition duration-300 focus:border-[#c4b5fd]/60 focus:bg-white/[0.025] focus:ring-4 focus:ring-[#c4b5fd]/[0.06]"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="level" className="mb-2 block text-sm text-white/70">
                {t.currentLevel}
              </label>
              <select
                id="level"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                className="w-full rounded-xl border border-white/[0.1] bg-[#171715] px-4 py-3.5 text-sm text-white/90 outline-none transition duration-300 focus:border-[#c4b5fd]/60 focus:ring-4 focus:ring-[#c4b5fd]/[0.06]"
              >
                <option value="beginner">{t.beginner}</option>
                <option value="intermediate">{t.basic}</option>
                <option value="advanced">{t.advanced}</option>
              </select>
            </div>

            <div>
              <label htmlFor="hours" className="mb-2 block text-sm text-white/70">
                {t.hoursPerWeek}
              </label>
              <select
                id="hours"
                value={hours}
                onChange={(event) => setHours(event.target.value)}

                className="w-full rounded-xl border border-white/[0.1] bg-[#171715] px-4 py-3.5 text-sm text-white/90 outline-none transition duration-300 focus:border-[#c4b5fd]/60 focus:ring-4 focus:ring-[#c4b5fd]/[0.06]"

              >
                <option value="2">2 часа</option>
                <option value="5">5 часов</option>
                <option value="7">7 часов</option>
                <option value="10">10 часов</option>
                <option value="15">15 часов</option>
                <option value="20">20 часов</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={generating || saving}

            className="inline-flex items-center justify-center rounded-xl bg-[#c4b5fd] px-7 py-4 text-sm font-semibold text-[#17131f] shadow-[0_0_30px_rgba(196,181,253,0.12)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d3c8ff] hover:shadow-[0_0_36px_rgba(196,181,253,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"

          >
            {generating ? "ELVORA продумывает твой путь..." : t.createRoute}
          </button>
        </form>

        {message && (
          <p role="status" aria-live="polite" className="mt-5 text-sm leading-6 text-[#c4b5fd]">
            {message}
          </p>
        )}
      </section>

      {generated && (

        <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#c4b5fd]/20 bg-gradient-to-br from-[#c4b5fd]/[0.06] via-white/[0.025] to-transparent p-6 shadow-[0_20px_80px_rgba(0,0,0,0.15)] sm:p-9">

          <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
            ТВОЙ AI-МАРШРУТ
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">{generated.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">
            {generated.summary}
          </p>
          <p className="mt-3 text-xs text-white/40">
            Ориентировочная продолжительность: {generated.estimated_weeks} недель
          </p>

          <div className="mt-8 space-y-8">
            {generated.stages.map((stage, index) => (
              <div key={`${stage.title}-${index}`}>
                <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                  ЭТАП {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 font-serif text-2xl">{stage.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">
                  {stage.objective}
                </p>
                <div className="mt-4">
                  {stage.steps.map((step) => renderStep(step))}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void saveRoute()}
            disabled={saving}

            className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#c4b5fd] px-7 py-4 text-sm font-semibold text-[#17131f] shadow-[0_0_24px_rgba(196,181,253,0.1)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d3c8ff] hover:shadow-[0_0_32px_rgba(196,181,253,0.2)] disabled:cursor-not-allowed disabled:opacity-50"

          >
            {saving ? "Сохраняем маршрут..." : "Сохранить маршрут ↗"}
          </button>
          <button
            type="button"
            onClick={() => setGenerated(null)}
            className="ml-4 mt-8 text-sm text-white/50 hover:text-white"
          >
            Отмена
          </button>
        </section>
      )}

      <section className="py-16 sm:py-20">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
          {t.yourProgress}
        </p>
        <h2 className="mt-3 font-serif text-3xl">{t.myRoutes}</h2>

        {loading ? (
          <p className="mt-6 text-sm text-white/50">Загружаем маршруты...</p>
        ) : routes.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/[0.12] bg-gradient-to-br from-white/[0.025] to-transparent px-6 py-12 text-center transition duration-300 hover:border-[#c4b5fd]/25 sm:px-10 sm:py-16">
            <p className="text-sm text-white/55">
              Здесь появятся твои маршруты после сохранения.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {routes.map((route) => {
              const completed = route.steps.filter(
                (step) => step.is_completed
              ).length;
              const total = route.steps.length;
              const percent = total
                ? Math.round((completed / total) * 100)
                : 0;

              const stages = Array.from(
                new Set(route.steps.map((step) => step.stage_title || "Основной этап"))
              );

              return (

                <article
                  key={route.id}
                  className="group rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.035] to-transparent p-5 transition duration-300 hover:border-[#c4b5fd]/25 hover:bg-white/[0.025] sm:p-7"
                >

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h3 className="font-serif text-2xl leading-tight tracking-tight transition-colors duration-300 group-hover:text-[#d8ccff] sm:text-3xl">{route.title}</h3>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void adaptRoute(route)}
                        disabled={adaptingRouteId !== null}
                        className="rounded-lg border border-white/[0.1] px-4 py-2.5 text-sm text-white/75 transition duration-300 hover:border-[#c4b5fd]/40 hover:bg-[#c4b5fd]/[0.06] hover:text-[#e4dcff] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {adaptingRouteId === route.id
                          ? "ELVORA анализирует..."
                          : t.adaptRoute}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteRoute(route)}
                        className="shrink-0 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-white/45 transition duration-300 hover:border-red-400/30 hover:bg-red-400/[0.05] hover:text-red-300"
                      >
                        {t.deleteRoute}
                      </button>
                    </div>
                  </div>


                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {route.summary}
                  </p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#e9d5ff] transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-white/40">
                    Выполнено {completed} из {total} шагов · {percent}%
                  </p>

                  <div className="mt-6 space-y-8">
                    {stages.map((stageTitle) => {
                      const stageSteps = route.steps.filter(
                        (step) => (step.stage_title || "Основной этап") === stageTitle
                      );

                      return (
                        <div key={stageTitle}>
                          <h4 className="font-serif text-xl">{stageTitle}</h4>
                          {stageSteps[0]?.stage_objective && (
                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {stageSteps[0].stage_objective}
                            </p>
                          )}
                          <div className="mt-2">
                            {stageSteps.map((step) => renderStep(step, true))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

        )}

        {adapted && (

          <section className="relative mt-8 overflow-hidden rounded-2xl border border-[#c4b5fd]/20 bg-gradient-to-br from-[#c4b5fd]/[0.06] via-white/[0.025] to-transparent p-6 shadow-[0_20px_80px_rgba(0,0,0,0.15)] sm:p-9">

            <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
              ПРЕДЛОЖЕНИЕ ELVORA AI
            </p>

            <h3 className="mt-3 font-serif text-3xl">
              {adapted.title}
            </h3>

            <p className="mt-3 text-sm leading-6 text-white/60">
              {adapted.summary}
            </p>

            <p className="mt-3 text-xs text-white/40">
              Примерная продолжительность: {adapted.estimated_weeks} недель
            </p>

            <div className="mt-8 space-y-8">
              {adapted.stages.map((stage, index) => (
                <div key={`${stage.title}-${index}`}>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                    ЭТАП {String(index + 1).padStart(2, "0")}
                  </p>

                  <h4 className="mt-2 font-serif text-2xl">
                    {stage.title}
                  </h4>

                  <p className="mt-2 text-sm leading-6 text-white/55">
                    {stage.objective}
                  </p>

                  <div className="mt-4">
                    {stage.steps.map((step) => renderStep(step))}
                  </div>
                </div>
              ))}
            </div>


            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-sm leading-6 text-white/50">
                Проверь обновлённый маршрут. После подтверждения новые шаги
                заменят невыполненную часть плана, а выполненные шаги и отзывы
                останутся сохранены.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => void applyAdaptation()}
                  disabled={applyingAdaptation}

                  className="inline-flex items-center justify-center rounded-xl bg-[#c4b5fd] px-7 py-3.5 text-sm font-semibold text-[#17131f] shadow-[0_0_24px_rgba(196,181,253,0.1)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#d3c8ff] hover:shadow-[0_0_32px_rgba(196,181,253,0.2)] disabled:cursor-not-allowed disabled:opacity-50"

                >
                  {applyingAdaptation
                    ? "Применяем адаптацию..."
                    : "Применить адаптацию ↗"}
                </button>

                <button
                  type="button"
                  disabled={applyingAdaptation}
                  onClick={() => {
                    setAdapted(null);
                    setAdaptedForRouteId(null);
                  }}
                  className="text-sm text-white/60 transition hover:text-white disabled:opacity-50"
                >
                  Отменить просмотр
                </button>
              </div>
            </div>

          </section>
        )}
      </section>

    </div>
  );
}
