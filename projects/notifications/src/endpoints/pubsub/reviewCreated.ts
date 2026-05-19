import type { Request } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import type { ReviewCreatedPayload} from "@starter/common/lib/src/types/pubsub";
import {getDb} from "booking/lib/src/orm/firestore";


export async function reviewCreated(request: Request, response: any): Promise<void> {
  const message = request.body?.message;
  if (!message?.data) {
    response.status(400).json({ error: "Missing message data" });
    return;
  }

  let payload: ReviewCreatedPayload;
  try {
    const decoded = Buffer.from(message.data, "base64").toString("utf8");
    payload = JSON.parse(decoded);
  } catch {
    response.status(400).json({ error: "Invalid message payload" });
    return;
  }

  const db = getDb();
  const eventId = randomUUID();

  await db.collection("reviewEvents").doc(eventId).set({
    eventId,
    sourceEventId: payload.eventId,
    uid: payload.uid,
    stayId: payload.stayId,
    reviewId: payload.reviewId,
    rating: payload.rating,
    processedAt: FieldValue.serverTimestamp(),
  });

  console.log("[pubsub] reviewCreated processed:", payload.reviewId, "rating:", payload.rating);

  response.status(200).json({ ok: true, eventId });
}
