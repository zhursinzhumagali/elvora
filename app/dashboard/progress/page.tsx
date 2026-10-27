
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    const { data: routes, error: routesError } = await supabase
        .from("routes")
        .select("id, title, created_at")
        .order("created_at", { ascending: false });

    if (routesError) {
        throw new Error("Не удалось загрузить маршруты.");
    }

    const routeList = routes ?? [];
    const routeIds = routeList.map((route) => route.id);

    let steps: {
        id: string;
        route_id: string;
        is_completed: boolean;
        completed_at: string | null;
    }[] = [];

    if (routeIds.length > 0) {
        const { data, error: stepsError } = await supabase
            .from("route_steps")
            .select("id, route_id, is_completed, completed_at")
            .in("route_id", routeIds);

        if (stepsError) {
            throw new Error("Не удалось загрузить прогресс.");
        }

        steps = data ?? [];
    }

    const completedSteps = steps.filter((step) => step.is_completed);
    const totalSteps = steps.length;
    const completedCount = completedSteps.length;
    const overallProgress = totalSteps
        ? Math.round((completedCount / totalSteps) * 100)
        : 0;

    const activeRoutes = routeList.filter((route) =>
        steps.some(
            (step) => step.route_id === route.id && !step.is_completed
        )
    ).length;

    const activityDates = [
        ...new Set(
            completedSteps
                .filter((step) => step.completed_at)
                .map((step) => step.completed_at!.slice(0, 10))
        ),
    ];

    const activitySet = new Set(activityDates);
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;

    let currentStreak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!activitySet.has(cursor.toLocaleDateString("en-CA"))) {
        cursor.setDate(cursor.getDate() - 1);
    }

    while (activitySet.has(cursor.toLocaleDateString("en-CA"))) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
    }

    let bestStreak = 0;
    let runningStreak = 0;
    const sortedDates = [...activityDates].sort();

    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            runningStreak = 1;
        } else {
            const previous = new Date(`${sortedDates[i - 1]}T12:00:00`);
            const current = new Date(`${sortedDates[i]}T12:00:00`);
            const difference = Math.round(
                (current.getTime() - previous.getTime()) / 86400000
            );

            runningStreak = difference === 1 ? runningStreak + 1 : 1;
        }

        bestStreak = Math.max(bestStreak, runningStreak);
    }

    const monthName = today.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
    });

    return (
        <main className="min-h-screen bg-[#10100f] px-5 py-8 text-[#f0eee9]">
            <div className="mx-auto max-w-5xl">
                <header className="flex items-center justify-between border-b border-white/10 pb-6">
                    <a href="/dashboard" className="text-2xl font-semibold tracking-tight">
                        elvora<span className="text-[#c4b5fd]">.</span>
                    </a>
                    <a
                        href="/dashboard"
                        className="text-sm text-white/60 transition hover:text-white"
                    >
                        ← К маршрутам
                    </a>
                </header>

                <section className="py-12 sm:py-16">
                    <p className="text-xs uppercase tracking-[0.25em] text-[#c4b5fd]">
                        ТВОЯ ИСТОРИЯ ОБУЧЕНИЯ
                    </p>
                    <h1 className="mt-5 font-serif text-5xl sm:text-6xl">
                        Мой прогресс<span className="text-[#c4b5fd]">.</span>
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-white/55">
                        Каждый завершённый шаг приближает тебя к цели.
                        Смотри, как формируется твоя привычка учиться.
                    </p>
                </section>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            label: "Текущий стрик",
                            value: `${currentStreak} дн.`,
                            icon: "🔥",
                        },
                        {
                            label: "Рекорд стрика",
                            value: `${bestStreak} дн.`,
                            icon: "🏆",
                        },
                        {
                            label: "Завершено шагов",
                            value: String(completedCount),
                            icon: "✓",
                        },
                        {
                            label: "Активные маршруты",
                            value: String(activeRoutes),
                            icon: "↗",
                        },
                    ].map((item) => (
                        <article
                            key={item.label}
                            className="border border-white/10 bg-white/[0.02] p-5"
                        >
                            <span className="text-xl">{item.icon}</span>
                            <p className="mt-5 font-serif text-3xl">{item.value}</p>
                            <p className="mt-2 text-xs text-white/45">{item.label}</p>
                        </article>
                    ))}
                </section>

                <section className="mt-6 border border-white/10 p-5 sm:p-8">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                                ПОСЛЕДОВАТЕЛЬНОСТЬ
                            </p>
                            <h2 className="mt-3 font-serif text-2xl">
                                Календарь активности
                            </h2>
                        </div>
                        <p className="text-sm capitalize text-white/50">{monthName}</p>
                    </div>

                    <div className="mt-7 grid grid-cols-7 gap-2">
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                            <div
                                key={day}
                                className="pb-2 text-center text-xs text-white/40"
                            >
                                {day}
                            </div>
                        ))}

                        {Array.from({ length: firstDay }, (_, index) => (
                            <div key={`empty-${index}`} />
                        ))}

                        {Array.from({ length: daysInMonth }, (_, index) => {
                            const day = index + 1;
                            const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const active = activitySet.has(date);

                            return (
                                <div
                                    key={date}
                                    title={active ? "Была учебная активность" : "Нет завершённых шагов"}
                                    className={`flex aspect-square items-center justify-center text-xs transition ${active
                                        ? "bg-[#8b5cf6] text-white"
                                        : "border border-white/[0.06] bg-white/[0.025] text-white/45"
                                        }`}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>

                    <p className="mt-5 text-xs leading-5 text-white/40">
                        Фиолетовые дни — дни, когда ты завершал учебные шаги.
                    </p>
                </section>

                <section className="mt-6 border border-white/10 p-5 sm:p-8">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                                ОБЩИЙ ПРОГРЕСС
                            </p>
                            <h2 className="mt-3 font-serif text-2xl">
                                Твои маршруты
                            </h2>
                        </div>
                        <span className="font-serif text-3xl">{overallProgress}%</span>
                    </div>

                    <div className="mt-5 h-1.5 bg-white/10">
                        <div
                            className="h-1.5 bg-[#c4b5fd] transition-all"
                            style={{ width: `${overallProgress}%` }}
                        />
                    </div>

                    <p className="mt-3 text-sm text-white/45">
                        Завершено {completedCount} из {totalSteps} шагов во всех маршрутах.
                    </p>

                    <div className="mt-7 space-y-5">
                        {routeList.map((route) => {
                            const routeSteps = steps.filter(
                                (step) => step.route_id === route.id
                            );
                            const done = routeSteps.filter(
                                (step) => step.is_completed
                            ).length;
                            const percent = routeSteps.length
                                ? Math.round((done / routeSteps.length) * 100)
                                : 0;

                            return (
                                <article key={route.id} className="border-t border-white/10 pt-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <h3 className="text-sm font-medium">{route.title}</h3>
                                        <span className="text-xs text-white/45">{percent}%</span>
                                    </div>
                                    <div className="mt-3 h-1 bg-white/10">
                                        <div
                                            className="h-1 bg-[#c4b5fd]"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <p className="mt-2 text-xs text-white/40">
                                        {done} из {routeSteps.length} шагов
                                    </p>
                                </article>
                            );
                        })}

                        {routeList.length === 0 && (
                            <p className="text-sm text-white/45">
                                Сохрани первый маршрут — и здесь появится твоя статистика.
                            </p>
                        )}
                    </div>
                </section>

                <section className="mt-6 border border-white/10 p-5 sm:p-8">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#c4b5fd]">
                        ТВОИ ДОСТИЖЕНИЯ
                    </p>
                    <h2 className="mt-3 font-serif text-2xl">Маленькие победы</h2>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        {[
                            {
                                title: "Первый шаг",
                                description: "Заверши первый шаг любого маршрута.",
                                unlocked: completedCount >= 1,
                            },
                            {
                                title: "Неделя обучения",
                                description: "Занимайся 7 дней подряд.",
                                unlocked: bestStreak >= 7,
                            },
                            {
                                title: "Десять шагов",
                                description: "Заверши 10 учебных шагов.",
                                unlocked: completedCount >= 10,
                            },
                            {
                                title: "Мастер постоянства",
                                description: "Достигни стрика в 30 дней.",
                                unlocked: bestStreak >= 30,
                            },
                        ].map((achievement) => (
                            <article
                                key={achievement.title}
                                className={`flex gap-4 border p-4 ${achievement.unlocked
                                    ? "border-[#c4b5fd]/40 bg-[#c4b5fd]/[0.06]"
                                    : "border-white/10 opacity-60"
                                    }`}
                            >
                                <span className="text-2xl">
                                    {achievement.unlocked ? "✦" : "◇"}
                                </span>
                                <div>
                                    <h3 className="text-sm font-medium">{achievement.title}</h3>
                                    <p className="mt-2 text-xs leading-5 text-white/45">
                                        {achievement.description}
                                    </p>
                                    <p className="mt-2 text-xs text-[#c4b5fd]">
                                        {achievement.unlocked ? "Открыто" : "Пока закрыто"}
                                    </p>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
