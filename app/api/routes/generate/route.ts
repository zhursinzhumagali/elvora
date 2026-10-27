
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

type RouteStep = {
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
};

type GeneratedRoute = {
  title: string;
  summary: string;
  estimated_weeks: number;
  stages: {
    title: string;
    objective: string;
    steps: RouteStep[];
  }[];
};

function validateRoute(value: unknown): value is GeneratedRoute {
  if (!value || typeof value !== "object") return false;

  const route = value as GeneratedRoute;

  if (
    typeof route.title !== "string" ||
    typeof route.summary !== "string" ||
    !Number.isInteger(route.estimated_weeks) ||
    route.estimated_weeks < 1 ||
    !Array.isArray(route.stages) ||
    route.stages.length < 1 ||
    route.stages.length > 8
  ) {
    return false;
  }

  return route.stages.every((stage) =>
    typeof stage.title === "string" &&
    typeof stage.objective === "string" &&
    Array.isArray(stage.steps) &&
    stage.steps.length >= 1 &&
    stage.steps.length <= 8 &&
    stage.steps.every((step) =>
      typeof step.title === "string" &&
      typeof step.explanation === "string" &&
      typeof step.task === "string" &&
      typeof step.success_criteria === "string" &&
      Number.isInteger(step.estimated_minutes) &&
      step.estimated_minutes > 0 &&
      Array.isArray(step.resources) &&
      step.resources.every((resource) =>
        typeof resource.title === "string" &&
        typeof resource.url === "string" &&
        typeof resource.reason === "string"
      )
    )
  );
}

export async function POST(request: Request) {
  try {
    // Проверяем, что запрос отправил авторизованный пользователь.
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
        { error: "Добавь GEMINI_API_KEY в файл .env.local." },
        { status: 500 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Не удалось прочитать данные запроса." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Некорректные данные запроса." },
        { status: 400 }
      );
    }

    const input = body as Record<string, unknown>;

    const goal =
      typeof input.goal === "string" ? input.goal.trim() : "";

    const level =
      typeof input.level === "string" ? input.level : "beginner";

    const hoursPerWeek = Number(input.hoursPerWeek);

    if (goal.length < 10 || goal.length > 2000) {
      return NextResponse.json(
        { error: "Опиши цель подробнее: от 10 до 2000 символов." },
        { status: 400 }
      );
    }

    if (!["beginner", "intermediate", "advanced"].includes(level)) {
      return NextResponse.json(
        { error: "Выбери корректный уровень." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(hoursPerWeek) ||
      hoursPerWeek < 1 ||
      hoursPerWeek > 40
    ) {
      return NextResponse.json(
        { error: "Укажи от 1 до 40 часов в неделю." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
Ты — ELVORA, персональный AI-наставник.

Создай реалистичный адаптивный маршрут к цели пользователя.

Цель:
${goal}

Текущий уровень:
${level}

Доступное время:
${hoursPerWeek} часов в неделю.

Требования:
1. Построй путь от текущего уровня к конкретному результату.
2. Создай от 3 до 6 последовательных этапов.
3. Для каждого этапа определи его название и цель.
4. Для каждого этапа создай от 2 до 5 конкретных шагов.
5. Каждый шаг должен содержать:
   - понятное название;
   - объяснение того, что изучать и почему;
   - практическое задание;
   - проверяемый критерий выполнения;
   - реалистичную длительность в минутах;
   - полезные учебные ресурсы, если можешь уверенно указать реальные ссылки.
6. Учитывай текущий уровень и время пользователя.
7. Не обещай гарантированное трудоустройство или гарантированный результат к определённой дате.
8. Не выдумывай URL. Если не уверен, что ресурс существует и подходит, верни пустой массив ресурсов для этого шага.
9. Используй русский язык.
10. Общая продолжительность должна быть реалистичной, выраженной в неделях.
11. Планируй обучение и практику, а не обычный список бытовых дел.
12. Не включай HTML или Markdown в поля ответа.

Верни только данные, соответствующие заданной JSON Schema.
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

    let parsed: unknown;

    try {
      parsed = JSON.parse(result.output_text);
    } catch {
      throw new Error("Gemini вернул некорректный JSON.");
    }

    if (!validateRoute(parsed)) {
      throw new Error("Gemini вернул маршрут неверной структуры.");
    }

    return NextResponse.json({ route: parsed });
  } catch (error) {
    console.error("ELVORA Gemini generation error:", error);

    return NextResponse.json(
      {
        error:
          "Не удалось создать маршрут. Проверь API-ключ, доступность модели и попробуй ещё раз.",
      },
      { status: 500 }
    );
  }
}
