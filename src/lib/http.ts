import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";

import { toJsonError } from "./errors";

type RouteHandlerContext = Record<string, unknown> & {
  params?: Record<string, string> | Promise<Record<string, string>>;
};

const isPromiseLike = <T>(value: unknown): value is PromiseLike<T> => {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  return typeof (value as PromiseLike<T>).then === "function";
};

const resolveRouteContext = async (context?: RouteHandlerContext): Promise<RouteHandlerContext> => {
  if (!context) {
    return {};
  }

  if (!context.params || !isPromiseLike(context.params)) {
    return context;
  }

  const resolvedParams = await context.params;
  return { ...context, params: resolvedParams };
};

export const parseBody = async <T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> => {
  const data = await request.json();
  return schema.parse(data);
};

export const handleRoute = <R>(handler: (request: NextRequest, context: RouteHandlerContext) => Promise<R | NextResponse>) => {
  return async (request: NextRequest, context?: RouteHandlerContext) => {
    try {
      const resolvedContext = await resolveRouteContext(context);
      const result = await handler(request, resolvedContext);
      if (result instanceof NextResponse) {
        return result;
      }
      return NextResponse.json(result);
    } catch (error) {
      const { status, body } = toJsonError(error);
      return NextResponse.json(body, { status });
    }
  };
};
