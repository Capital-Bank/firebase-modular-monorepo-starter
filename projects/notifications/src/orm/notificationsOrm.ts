import { FieldValue } from "firebase-admin/firestore";

import type { NotificationReadyToSendPayload } from "@starter/common";

import { getDb } from "./firestore";

export async function recordNotificationSent(opts: {
  payload: NotificationReadyToSendPayload;
  sourceMessageId?: string | null;
}): Promise<{ notificationId: string }> {
  const db = getDb();
  const notificationRef = db.collection("notifications").doc(opts.payload.eventId);

  await notificationRef.set(
    {
      notificationId: opts.payload.eventId,
      stayId: opts.payload.stayId,
      uid: opts.payload.uid,
      template: opts.payload.template,
      payload: opts.payload.payload,
      sourceMessageId: opts.sourceMessageId ?? null,
      status: "sent",
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { notificationId: opts.payload.eventId };
}
export async function listNotifications(opts: {
  limit: number;
  cursor?: string;
  sortBy: "createdAt" | "template" | "status";
  sortDirection: "asc" | "desc";
  search?: string;
  status?: string;
  template?: string;
  stayId?: string;
  uid?: string;
}): Promise<{
  notifications: Array<{
    notificationId: string;
    stayId: string;
    uid: string;
    template: string;
    status: string;
    payload?: unknown;
    createdAt?: FirebaseFirestore.Timestamp;
  }>;
  nextCursor?: string;
}> {
  const db = getDb();

  let query: FirebaseFirestore.Query = db.collection("notifications");

  if (opts.status) {
    query = query.where("status", "==", opts.status);
  }

  if (opts.template) {
    query = query.where("template", "==", opts.template);
  }

  if (opts.stayId) {
    query = query.where("stayId", "==", opts.stayId);
  }

  if (opts.uid) {
    query = query.where("uid", "==", opts.uid);
  }

  query = query.orderBy(opts.sortBy, opts.sortDirection);

  if (opts.cursor) {
    const cursorDoc = await db.collection("notifications").doc(opts.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snap = await query.limit(opts.limit + 1).get();

  let docs = snap.docs;

  if (opts.search) {
    const search = opts.search.toLowerCase();
    docs = docs.filter((doc) => {
      const data = doc.data() as any;
      return (
        String(data.notificationId || doc.id).toLowerCase().includes(search) ||
        String(data.stayId || "").toLowerCase().includes(search) ||
        String(data.uid || "").toLowerCase().includes(search) ||
        String(data.template || "").toLowerCase().includes(search) ||
        String(data.status || "").toLowerCase().includes(search)
      );
    });
  }

  const pageDocs = docs.slice(0, opts.limit);
  const extraDoc = snap.docs.length > opts.limit ? snap.docs[opts.limit] : undefined;

  return {
    notifications: pageDocs.map((doc) => {
      const data = doc.data() as any;
      return {
        notificationId: String(data.notificationId || doc.id),
        stayId: String(data.stayId || ""),
        uid: String(data.uid || ""),
        template: String(data.template || ""),
        status: String(data.status || ""),
        payload: data.payload,
        createdAt: data.createdAt,
      };
    }),
    nextCursor: extraDoc?.id,
  };
}
