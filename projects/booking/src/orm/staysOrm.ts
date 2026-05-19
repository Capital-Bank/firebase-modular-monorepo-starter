import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {randomUUID} from "node:crypto";
import { PUBSUB_TOPIC, publishMessage } from "@starter/common/";

import {getDb} from "./firestore";

import { StayDocument, StayStatus} from "../types";
import {listIsoDatesInclusive} from "../utils";

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

        const availabilitySnaps = await Promise.all(availabilityRefs.map(({ref}) => tx.get(ref)));

        // Validate first (still read-only).
        for (let i = 0; i < availabilityRefs.length; i++) {
            const {date} = availabilityRefs[i];
            const data = availabilitySnaps[i].data() as any;

            const capacity = typeof data?.capacity === "number" ? data.capacity : 0;
            const reservedCount = typeof data?.reservedCount === "number" ? data.reservedCount : 0;

            if (reservedCount + 1 > capacity) {
                throw new Error(`No capacity for date ${date}`);
            }
        }

        // Apply writes after all reads/validation.
        for (const {date, ref} of availabilityRefs) {
            tx.set(
                ref,
                {
                    date,
                    reservedCount: FieldValue.increment(1),
                    updatedAt: FieldValue.serverTimestamp(),
                },
                {merge: true},
            );
        }

        const doc: StayDocument = {
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

    await publishMessage(PUBSUB_TOPIC.stayCreated, {
        eventId: `stay_created: ${stayId}`,
        uid: opts.uid,
        stayId
    });

    console.log("[pubsub] publish stay created: ", stayId);

    return {stayId, status: "pending"};
}

export async function cancelStay(opts: { stayId: string }): Promise<{ stayId: string; status: "cancelled" }> {
    const db = getDb();

    await db.runTransaction(async (tx) => {
        const stayRef = db.collection("stays").doc(opts.stayId);
        const staySnap = await tx.get(stayRef);

        if (!staySnap.exists) {
            throw new Error(`Stay ${opts.stayId} not found`);
        }

        const data = staySnap.data() as any;
        const status = data.status as StayStatus;

        if (status === "cancelled") return;

        if (status !== "pending" && status !== "confirmed") {
            throw new Error(`Stay cannot be cancelled (status: ${status})`);
        }

        const dates = listIsoDatesInclusive(data.startDate, data.endDate);
        const availabilityRefs = dates.map((date) => db.collection("availability").doc(date));
        const availabilitySnaps = await Promise.all(availabilityRefs.map((ref) => tx.get(ref)));

        tx.update(stayRef, {
            status: "cancelled",
            updatedAt: FieldValue.serverTimestamp(),
        });

        for (let i = 0; i < availabilityRefs.length; i++) {
            if (availabilitySnaps[i].exists) {
                tx.set(
                    availabilityRefs[i],
                    {
                        reservedCount: FieldValue.increment(-1),
                        updatedAt: FieldValue.serverTimestamp(),
                    },
                    { merge: true },
                );
            }
        }

        // TODO: publish notification.ready_to_send (template: stay_cancelled)
        // when Pub/Sub is setup chek this up — see docs/CONTRACTS_V1.md
    });

    return { stayId: opts.stayId, status: "cancelled" };
}

export async function listStaysByRating(opts: {
    order: "asc" | "desc";
    limit: number;
}): Promise<
    Array<{
        stayId: string;
        petName: string;
        averageRating: number;
        reviewCount: number;
    }>
> {
    const db = getDb();

    const snap = await db
        .collection("stays")
        .where("averageRating", ">", 0)
        .orderBy("averageRating", opts.order)
        .limit(opts.limit)
        .get();

    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        stayId: String(data.stayId || d.id),
        petName: String(data.petName || ""),
        averageRating: typeof data.averageRating === "number" ? data.averageRating : 0,
        reviewCount: data.reviewCount === "number" ? data.reviewCount : 0,
      };
    });
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
