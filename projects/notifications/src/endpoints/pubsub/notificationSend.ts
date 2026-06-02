import type { Request } from "firebase-functions/v2/https";

import type { NotificationReadyToSendPayload } from "@starter/common";

import { recordNotificationSent } from "../../orm/notificationsOrm";

function decodePubSubPayload(request: Request): NotificationReadyToSendPayload {
  const encoded = request.body?.message?.data;

  if (typeof encoded !== "string" || !encoded.trim()) {
    throw new Error("Missing Pub/Sub message data");
  }

  const json = Buffer.from(encoded, "base64").toString("utf8");
  const payload = JSON.parse(json) as Partial<NotificationReadyToSendPayload>;

  if (typeof payload.eventId !== "string" || !payload.eventId.trim()) {
    throw new Error("eventId is required");
  }
  if (typeof payload.stayId !== "string" || !payload.stayId.trim()) {
    throw new Error("stayId is required");
  }
  if (typeof payload.uid !== "string" || !payload.uid.trim()) {
    throw new Error("uid is required");
  }
  if (payload.template !== "stay_cancelled") {
    throw new Error("Unsupported notification template");
  }

  return {
    eventId: payload.eventId.trim(),
    stayId: payload.stayId.trim(),
    uid: payload.uid.trim(),
    template: payload.template,
    payload: {
      reason: typeof payload.payload?.reason === "string" ? payload.payload.reason : null,
    },
  };
}

export async function notificationSend(request: Request, response: any) {
  try {
    const payload = decodePubSubPayload(request);
    const result = await recordNotificationSent({
      payload,
      sourceMessageId: request.body?.message?.messageId ?? null,
    });

    response.status(200).json({ ok: true, notificationId: result.notificationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process notification";
    response.status(400).json({ error: message });
  }
}
