import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { getSession, saveSession, destroySession } from "@/lib/session";
import { verifyPassword } from "@/lib/passwords";

export const login = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { team: true },
  });

  if (!user) {
    throw new AppError("INVALID_LOGIN", "Invalid credentials", 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("INVALID_LOGIN", "Invalid credentials", 401);
  }

  const session = await getSession();
  session.userId = user.id;
  session.teamId = user.teamId;
  session.role = user.role;
  await saveSession(session);

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    team: {
      id: user.team.id,
      name: user.team.name,
      slug: user.team.slug,
    },
  };
};

export const logout = async () => {
  const session = await getSession();
  if (!session.userId) {
    return;
  }
  await destroySession(session);
};

export const requireUser = async () => {
  const session = await getSession();
  if (!session.userId || !session.teamId || !session.role) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }
  return session;
};

export const getCurrentUser = async () => {
  const session = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { team: true },
  });

  if (!user) {
    throw new AppError("USER_NOT_FOUND", "User not found", 404);
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
    team: user.team,
  };
};

export const getCurrentUserOrRedirect = async () => {
  try {
    return await getCurrentUser();
  } catch (error) {
    if (error instanceof AppError && error.status === 401) {
      redirect("/login");
    }
    throw error;
  }
};
