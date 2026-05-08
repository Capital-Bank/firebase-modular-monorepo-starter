import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import { getDb } from "./firestore";

import type { StayDoc, StayStatus } from "../types";
import { listIsoDatesInclusive } from "../utils";

export async function createPendingStay(opts: {
  uid: string;
  petName: string;
  startDate: string;
  endDate: string;
  ttlMinutes: number;
}): Promise<{ stayId: string; status: "pending" }> {
  const stayId = '1';
  const db = getDb();

  const expiresAt = new Timestamp(
    Math.floor(Date.now() / 1000) + opts.ttlMinutes * 60,
    0,
  );

  const docRef = db.collection("stays").doc(stayId);
  const availabilityDates = listIsoDatesInclusive(opts.startDate, opts.endDate);

  await db.runTransaction(async (tx) => {
    // Firestore transaction rule: all reads must happen before any writes.
    const availabilityRefs = availabilityDates.map((date) => ({
      date,
      ref: db.collection("availability").doc(date),
    }));

    const availabilitySnaps = await Promise.all(availabilityRefs.map(({ ref }) => tx.get(ref)));

    // Validate first (still read-only).
    for (let i = 0; i < availabilityRefs.length; i++) {
      const { date } = availabilityRefs[i];
      const data = availabilitySnaps[i].data() as any;

      const capacity = typeof data?.capacity === "number" ? data.capacity : 0;
      const reservedCount = typeof data?.reservedCount === "number" ? data.reservedCount : 0;

      if (reservedCount + 1 > capacity) {
        throw new Error(`No capacity for date ${date}`);
      }
    }

    // Apply writes after all reads/validation.
    for (const { date, ref } of availabilityRefs) {
      tx.set(
        ref,
        {
          date,
          reservedCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    const doc: StayDoc = {
      stayId,
      uid: opts.uid,
      petName: opts.petName,
      startDate: opts.startDate,
      endDate: opts.endDate,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt,
    };

    tx.set(docRef, doc);
  });

  return { stayId, status: "pending" };
}

export async function listStays(opts: { limit: number }): Promise<
  Array<{
    stayId: string;
    uid: string;
    petName: string;
    startDate: string;
    endDate: string;
    status: StayStatus;
    createdAt?: FirebaseFirestore.Timestamp;
  }>
> {
  const db = getDb();
  const snap = await db
    .collection("stays")
    .orderBy("createdAt", "desc")
    .limit(opts.limit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      stayId: String(data.stayId || d.id),
      uid: String(data.uid || ""),
      petName: String(data.petName || ""),
      startDate: String(data.startDate || ""),
      endDate: String(data.endDate || ""),
      status: (data.status || "pending") as StayStatus,
      createdAt: data.createdAt,
    };
  });
}
