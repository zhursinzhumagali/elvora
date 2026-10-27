
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const routeSchema = {
    type: "object",
    properties: {
        title: { type: "string" },
        summary: { type: "string" },
        estimated_weeks: { type: "integer" },
        stages: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    objective: { type: "string" },
                    steps: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                explanation: { type: "string" },
                                task: { type: "string" },
                                success_criteria: { type: "string" },
                                estimated_minutes: { type: "integer" },
                                resources: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                            url: { type: "string" },
                                            reason: { type: "string" },
                                        },
                                        required: ["title", "url", "reason"],
                                    },
                                },
                            },
                            required: [
                                "title",
                                "explanation",
                                "task",
                                "success_criteria",
                                "estimated_minutes",
                                "resources",
                            ],
                        },
                    },
                },
                required: ["title", "objective", "steps"],
            },
        },
    },
    required: ["title", "summary", "estimated_weeks", "stages"],
} as const;

type AdaptedRoute = {
    title: string;
    summary: string;
    estimated_weeks: number;
    stages: {
        title: string;
        objective: string;
        steps: {
            title: string;
            explanation: string;
            task: string;
            success_criteria: string;
            estimated_minutes: number;
            resources: {
                title: string;
                url: string;
                reason: string;
            }[];
        }[];
    }[];
};

function isAdaptedRoute(value: unknown): value is AdaptedRoute {
    if (!value || typeof value !== "object") return false;

    const route = value as AdaptedRoute;

    return (
        typeof route.title === "string" &&
        typeof route.summary === "string" &&
        Number.isInteger(route.estimated_weeks) &&
        route.estimated_weeks >= 1 &&
        Array.isArray(route.stages) &&
        route.stages.length >= 1 &&
        route.stages.length <= 8 &&
        route.stages.every(
            (stage) =>
                typeof stage.title === "string" &&
                typeof stage.objective === "string" &&
                Array.isArray(stage.steps) &&
                stage.steps.length >= 1 &&
                stage.steps.length <= 8 &&
                stage.steps.every(
                    (step) =>
                        typeof step.title === "string" &&
                        typeof step.explanation === "string" &&
                        typeof step.task === "string" &&
                        typeof step.success_criteria === "string" &&
                        Number.isInteger(step.estimated_minutes) &&
                        step.estimated_minutes > 0 &&
                        Array.isArray(step.resources) &&
                        step.resources.every(
                            (resource) =>
                                typeof resource.title === "string" &&
                                typeof resource.url === "string" &&
                                typeof resource.reason === "string"
                        )
                )
        )
    );
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Сначала войди в свой аккаунт." },
                { status: 401 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Не найден GEMINI_API_KEY." },
                { status: 500 }
            );
        }

        const body: unknown = await request.json();

        if (
            !body ||
            typeof body !== "object" ||
            !("routeId" in body) ||
            typeof body.routeId !== "string" ||
            !body.routeId.trim()
        ) {
            return NextResponse.json(
                { error: "Не указан маршрут для адаптации." },
                { status: 400 }
            );
        }

        const { data: route, error: routeError } = await supabase
            .from("routes")
            .select(
                "id, title, goal, summary, user_level, hours_per_week, estimated_weeks"
            )
            .eq("id", body.routeId)
            .eq("user_id", user.id)
            .single();

        if (routeError || !route) {
            return NextResponse.json(
                { error: "Маршрут не найден." },
                { status: 404 }
            );
        }

        const { data: steps, error: stepsError } = await supabase
            .from("route_steps")
            .select(
                "title, stage_title, stage_objective, explanation, task, success_criteria, estimated_minutes, resources, position, is_completed, difficulty_rating, feedback_note"
            )
            .eq("route_id", route.id)
            .eq("user_id", user.id)
            .order("position", { ascending: true });

        if (stepsError) {
            return NextResponse.json(
                { error: "Не удалось загрузить шаги маршрута." },
                { status: 500 }
            );
        }

        if (!steps || steps.length === 0) {
            return NextResponse.json(
                { error: "В маршруте пока нет шагов для анализа." },
                { status: 400 }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
Ты — ELVORA, персональный AI-наставник.

Твоя задача — адаптировать существующий учебный маршрут.
Используй русский язык.

Цель пользователя:
${route.goal}

Текущий уровень:
${route.user_level ?? "beginner"}

Доступное время в неделю:
${route.hours_per_week ?? 5} часов

Текущий маршрут и обратная связь:
${JSON.stringify(steps)}

Правила адаптации:
1. Сохрани исходную цель пользователя.
2. Учитывай выполненные шаги, оценки сложности и комментарии.
3. Если шаг был сложным, предложи более понятное объяснение,
   дополнительные упражнения или необходимые предварительные темы.
4. Если шаг был лёгким, можно предложить более сложную практику.
5. Если обратной связи недостаточно, не делай необоснованных выводов.
6. Не помечай шаги как выполненные в новом плане.
7. Создай от 3 до 6 этапов, в каждом от 2 до 5 шагов.
8. Каждый шаг должен содержать объяснение, практическое задание,
   проверяемый критерий, длительность в минутах и массив ресурсов.
9. Не выдумывай ссылки. Если не уверен в URL, верни пустой массив ресурсов.
10. Учитывай доступное время пользователя.
11. Не обещай гарантированный результат или трудоустройство.
12. Верни новый предлагаемый маршрут, не описание изменений.
13. Не включай HTML или Markdown в поля ответа.
14. Выполненные шаги считай пройденной историей, а не задачами
    для повторного выполнения.
15. Новый маршрут должен сосредоточиться на невыполненных шагах:
    продолжай обучение с текущего уровня пользователя.
16. Не копируй выполненные шаги в новый план без необходимости.
17. Если пользователь испытывал трудности, добавляй нужные
    объяснения и практику в оставшуюся часть маршрута.
18. Сохраняй исходную цель и учитывай все оценки сложности
    и комментарии пользователя.

Верни только JSON по заданной схеме.
`;

        const result = await ai.interactions.create({
            model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
            input: prompt,
            response_format: {
                type: "text",
                mime_type: "application/json",
                schema: routeSchema,
            },
        });

        if (!result.output_text) {
            throw new Error("Gemini вернул пустой ответ.");
        }

        let adapted: unknown;

        try {
            adapted = JSON.parse(result.output_text);
        } catch {
            throw new Error("Gemini вернул некорректный JSON.");
        }

        if (!isAdaptedRoute(adapted)) {
            throw new Error("Gemini вернул маршрут неверной структуры.");
        }

        // Пока только возвращаем предложение.
        // Существующий маршрут в базе не изменяется.
        return NextResponse.json({ route: adapted });
    } catch (error) {
        console.error("ELVORA route adaptation error:", error);

        return NextResponse.json(
            {
                error:
                    "Не удалось адаптировать маршрут. Попробуй ещё раз.",
            },
            { status: 500 }
        );
    }
}
