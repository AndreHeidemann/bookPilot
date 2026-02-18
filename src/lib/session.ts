import "server-only";

import { IronSession, SessionOptions, sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";

import { UserRole } from "@prisma/client";

import { AppError } from "./errors";
import { appConfig } from "./config";

export type SessionData = {
  userId?: string;
  teamId?: string;
  role?: UserRole;
};

const sessionOptions: SessionOptions = {
  password: appConfig.sessionPassword,
  cookieName: "bp_session",
  ttl: 60 * 60 * 24 * 7, // 7 days
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  },
};

const createSession = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  initialData: SessionData,
  canMutate: boolean,
): IronSession<SessionData> => {
  const data: SessionData = { ...initialData };

  const save = async () => {
    if (!canMutate || typeof cookieStore.set !== "function") return;
    const value = await sealData(data, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    });
    cookieStore.set(sessionOptions.cookieName, value, {
      ...sessionOptions.cookieOptions,
      maxAge: sessionOptions.ttl,
    });
  };

  const destroy = () => {
    if (!canMutate || typeof cookieStore.set !== "function") return;
    data.userId = undefined;
    data.teamId = undefined;
    data.role = undefined;
    cookieStore.set(sessionOptions.cookieName, "", {
      ...sessionOptions.cookieOptions,
      maxAge: 0,
    });
  };

  const session = Object.assign(data, {
    save,
    destroy,
    updateConfig: () => {},
  });

  return session as IronSession<SessionData>;
};

export const getSession = async () => {
  const cookieStore = await cookies();
  const canGet = typeof cookieStore.get === "function";
  const canSet = typeof cookieStore.set === "function";

  if (!canGet) {
    return createSession(cookieStore, {}, false);
  }

  const cookieValue = cookieStore.get(sessionOptions.cookieName)?.value;
  if (!cookieValue) {
    return createSession(cookieStore, {}, canSet);
  }

  try {
    const data = await unsealData<SessionData>(cookieValue, {
      password: sessionOptions.password,
      ttl: sessionOptions.ttl,
    });
    return createSession(cookieStore, data ?? {}, canSet);
  } catch (error) {
    console.warn("Failed to decode session cookie", error);
    return createSession(cookieStore, {}, canSet);
  }
};

export const requireSession = async () => {
  const session = await getSession();
  if (!session.userId || !session.teamId || !session.role) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  return session as IronSession<Required<SessionData>>;
};

export const saveSession = async (session: IronSession<SessionData>) => {
  await session.save();
};

export const destroySession = async (session: IronSession<SessionData>) => {
  session.destroy();
};
