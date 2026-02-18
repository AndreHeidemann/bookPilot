import { UserRole } from "@prisma/client";

export const canEditAvailability = (role: UserRole) => role === "ADMIN" || role === "MANAGER";

export const canManageBookings = (role: UserRole) => role === "ADMIN" || role === "MANAGER";

export const canViewAllBookings = (role: UserRole) => role === "ADMIN" || role === "MANAGER" || role === "MEMBER";

export const canManageTeam = (role: UserRole) => role === "ADMIN";
