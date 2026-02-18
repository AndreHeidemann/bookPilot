import { NextRequest } from "next/server";
import { z } from "zod";

import { login } from "@/server/auth/service";
import { parseBody, handleRoute } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const body = await parseBody(request, schema);
  const user = await login(body.email, body.password);
  return { user };
});
