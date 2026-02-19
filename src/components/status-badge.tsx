import type { BookingStatus } from "@prisma/client";

import { Badge } from "./ui/badge";

const config: Record<BookingStatus, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  PENDING_PAYMENT: { label: "Pending Payment", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "danger" },
};

export const StatusBadge = ({ status }: { status: BookingStatus }) => {
  const meta = config[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
};
