
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Resource = {
    title: string;
    url: string;
    reason: string;
};

type AdaptedStep = {
    title: string;
    explanation: string;
    task: string;
    success_criteria: string;
    estimated_minutes: number;
    resources: Resource[];
};

type AdaptedStage = {
    title: string;
    objective: string;
    steps: AdaptedStep[];
};

type AdaptedRoute = {
    title: string;
    summary: string;
    estimated_weeks: number;
    stages: AdaptedStage[];
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

        const body: unknown = await request.json();

        if (
            !body ||
            typeof body !== "object" ||
            !("routeId" in body) ||
            typeof body.routeId !== "string" ||
            !body.routeId.trim() ||
            !("adaptedRoute" in body) ||
            !isAdaptedRoute(body.adaptedRoute)
        ) {
            return NextResponse.json(
                { error: "Некорректные данные адаптации." },
                { status: 400 }
            );
        }

        const { data: route, error: routeError } = await supabase
            .from("routes")
            .select("id")
            .eq("id", body.routeId)
            .eq("user_id", user.id)
            .single();

        if (routeError || !route) {
            return NextResponse.json(
                { error: "Маршрут не найден." },
                { status: 404 }
            );
        }

        const newSteps = body.adaptedRoute.stages.flatMap((stage) =>
            stage.steps.map((step) => ({
                title: step.title,
                stage_title: stage.title,
                stage_objective: stage.objective,
                explanation: step.explanation,
                task: step.task,
                success_criteria: step.success_criteria,
                estimated_minutes: step.estimated_minutes,
                resources: step.resources,
            }))
        );

        const { error: applyError } = await supabase.rpc(
            "apply_route_adaptation",
            {
                p_route_id: route.id,
                p_title: body.adaptedRoute.title,
                p_summary: body.adaptedRoute.summary,
                p_estimated_weeks: body.adaptedRoute.estimated_weeks,
                p_steps: newSteps,
            }
        );

        if (applyError) {
            console.error("Apply adaptation error:", applyError);

            return NextResponse.json(
                { error: "Не удалось применить адаптацию маршрута." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("ELVORA apply adaptation error:", error);

        return NextResponse.json(
            { error: "Не удалось применить адаптацию. Попробуй ещё раз." },
            { status: 500 }
        );
    }
}
