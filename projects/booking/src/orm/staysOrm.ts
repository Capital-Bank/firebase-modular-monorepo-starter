import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import { getDb } from "./firestore";

import type { StayDoc, StayStatus } from "../types";
import { get400Error, listIsoDatesInclusive } from "../utils";

export async function createPendingStay(opts: {
  uid: string;
  petName: string;
  startDate: string;
  endDate: string;
  ttlMinutes: number;
}): Promise<{ stayId: string; status: "pending" }> {
  const stayId = randomUUID();
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
export async function getStayDetails(opts: {stayId:string}): Promise<
 {
    stayId: string;
    uid: string;
    petName: string;
    startDate: string;
    endDate: string;
    status: StayStatus;
    createdAt?: FirebaseFirestore.Timestamp;
  }
  >{
     const db = getDb()
     const document = await db.collection("stays").doc(opts.stayId).get()
     if(!document.exists){
      throw get400Error("No document found")
     }
     const d = document.data() as any
     return {
      stayId: String(d.stayId || d.id),
      uid: String(d.uid || ""),
      petName: String(d.petName || ""),
      startDate: String(d.startDate || ""),
      endDate: String(d.endDate || ""),
      status: (d.status || "pending") as StayStatus,
      createdAt: d.createdAt,
    };
  }
export async function cancelStay(opts: { stayId: string, reason?:string}): Promise<{
  stayId: string;
  status: "cancelled";

}> {
  const db = getDb();
  const stayRef = db.collection("stays").doc(opts.stayId);

  await db.runTransaction(async (tx) => {
    const staySnap = await tx.get(stayRef);
    if (!staySnap.exists) {
      throw new Error(`Stay not found: ${opts.stayId}`);
    }

    const stay = staySnap.data() as Partial<StayDoc> | undefined;
    const status = stay?.status;

    if (status === "cancelled") {
      return;
    }
    if (status === "expired") {
      throw new Error(`Stay is already expired: ${opts.stayId}`);
    }
    if (status !== "pending" && status !== "confirmed") {
      throw new Error(`Stay cannot be cancelled from status: ${String(status)}`);
    }
    if (typeof stay?.startDate !== "string" || typeof stay?.endDate !== "string") {
      throw new Error(`Stay has invalid date range: ${opts.stayId}`);
    }

    
    const availabilityRefs = listIsoDatesInclusive(stay.startDate, stay.endDate).map((date) => ({
      date,
      ref: db.collection("availability").doc(date),
    }));
    const availabilitySnaps = await Promise.all(availabilityRefs.map(({ ref }) => tx.get(ref)));

    for (let i = 0; i < availabilityRefs.length; i++) {
      const { date } = availabilityRefs[i];
      const data = availabilitySnaps[i].data() as any;
      const reservedCount = typeof data?.reservedCount === "number" ? data.reservedCount : 0;
      if (reservedCount < 1) {
        throw new Error(`Cannot release capacity for date ${date}`);
      }
    }

    for (const { ref } of availabilityRefs) {
      tx.set(
        ref,
        {
          reservedCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    tx.update(stayRef, {
      status: "cancelled",
      updatedAt: FieldValue.serverTimestamp(),
    });
    const eventRef = stayRef.collection("events").doc()
    tx.set(eventRef, {
      type: "cancelled",
      stayId:opts.stayId,
      reason: opts.reason || null,
      createdAt: FieldValue.serverTimestamp()
    })

  });

  return { stayId: opts.stayId, status: "cancelled" };
}
export async function createStayNote(opts: {stayId: string; text:string}): Promise<{stayId: string; noteId:string}>  {
  const db = getDb()

  const stayRef = db.collection("stays").doc(opts.stayId)
  const staySnap = await stayRef.get()
  
  if(!staySnap.exists) {
    throw get400Error(`Stay not found: ${opts.stayId}`)
  }
  const noteRef = stayRef.collection("notes").doc()
  await noteRef.set({
    stayId: opts.stayId,
    text: opts.text,
    createdAt: FieldValue.serverTimestamp()
  })

  return {
    stayId:opts.stayId,
    noteId:  noteRef.id
  }
}

export async function listStayNotes(opts: { stayId: string }): Promise<
  Array<{
    noteId: string;
    stayId: string;
    text: string;
    createdAt?: FirebaseFirestore.Timestamp;
  }>
> {
  const db = getDb();

  const stayRef = db.collection("stays").doc(opts.stayId);
  const staySnap = await stayRef.get();

  if (!staySnap.exists) {
    throw get400Error(`Stay not found: ${opts.stayId}`);
  }

  const notesSnap = await stayRef
    .collection("notes")
    .orderBy("createdAt", "desc")
    .get();

  return notesSnap.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      noteId: doc.id,
      stayId: String(data.stayId || opts.stayId),
      text: String(data.text || ""),
      createdAt: data.createdAt,
    };
  });
}

export async function listStayEvents(opts: {stayId:string}): Promise<Array<{
    eventId:string
    type: string;
    stayId:string
    reason: string;
    createdAt?: unknown;
  }>> {
    const db = getDb()

    const stayRef= db.collection("stays").doc(opts.stayId)
    const staySnap = await stayRef.get()

    if (!staySnap.exists) {
    throw get400Error(`Stay not found: ${opts.stayId}`);
  }

  const eventsSnap = await stayRef
    .collection("events")
    .orderBy("createdAt", "desc")
    .get();

  return eventsSnap.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      eventId: doc.id,
      type: String(data.type || ""),
      stayId: String(data.stayId || opts.stayId),
      reason: String(data.reason || ""),
      createdAt: data.createdAt,
    };
  });
}