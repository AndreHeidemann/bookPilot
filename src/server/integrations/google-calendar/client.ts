import { calendar_v3, google } from "googleapis";

import { appConfig } from "@/lib/config";

let calendarClient: calendar_v3.Calendar | null = null;

const getCalendarClient = async () => {
  if (
    !appConfig.googleServiceAccountEmail ||
    !appConfig.googlePrivateKey ||
    !appConfig.googleCalendarId
  ) {
    return null;
  }

  if (!calendarClient) {
    const auth = new google.auth.JWT({
      email: appConfig.googleServiceAccountEmail,
      key: appConfig.googlePrivateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    calendarClient = google.calendar({ version: "v3", auth });
  }

  return calendarClient;
};

export const createCalendarEvent = async (payload: {
  bookingId: string;
  customerName: string;
  summary?: string;
  description?: string;
  startAt: Date;
  endAt: Date;
}) => {
  const client = await getCalendarClient();
  if (!client) {
    return {
      eventId: `stub-${payload.bookingId}`,
      htmlLink: undefined,
    };
  }

  const inserted = await client.events.insert({
    calendarId: appConfig.googleCalendarId!,
    requestBody: {
      summary: payload.summary ?? `Booking – ${payload.customerName}`,
      description: payload.description,
      start: {
        dateTime: payload.startAt.toISOString(),
      },
      end: {
        dateTime: payload.endAt.toISOString(),
      },
      reminders: {
        useDefault: true,
      },
    },
  });

  return {
    eventId: inserted.data.id ?? `stub-${payload.bookingId}`,
    htmlLink: inserted.data.htmlLink ?? undefined,
  };
};
