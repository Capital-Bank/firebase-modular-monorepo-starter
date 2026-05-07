import { FieldValue} from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import { getDb } from "./firestore";
import {BookingReviewsListInput, BookingReviewsListOutput, ReviewDocument} from "../types";
import type {
    BookingReviewCreateInput,
    BookingReviewsListAllOutput
} from "@starter/common";


export async function createReview(opts: BookingReviewCreateInput): Promise <{ reviewId: string }> {

    const db = getDb();
    const reviewId = randomUUID();

    const staySnap = await db.collection("stays").doc(opts.stayId).get();
    console.log(staySnap);
    if (!staySnap.exists) {
        throw new Error('No such stay');
    }

    const doc: ReviewDocument =
        {
            reviewId,
            uid: opts.uid,
            stayId: opts.stayId,
            rating: opts.rating,
            comment: opts.comment,
            createdAt: FieldValue.serverTimestamp(),
        };

    const subColRef = db
        .collection("stays").doc(opts.uid)
        .collection("reviews").doc(reviewId);

    const topColRef = db.
        collection('reviews').doc(reviewId);

    await db.collection("stays").doc(opts.stayId)
        .collection("reviews").doc(reviewId)
        .set(doc);

    const batch = db.batch();
    batch.set(subColRef, doc)
    batch.set(topColRef, doc);
    await batch.commit();

    return { reviewId }
}

export async function listReviews(opts: BookingReviewsListInput): Promise<BookingReviewsListOutput> {
    const db = getDb();

    const snap = await db.collection("stays").doc(opts.stayId)
        .collection("reviews")
        .orderBy("createdAt", "desc")
        .get();

    return {
        reviews: snap.docs.map((d) => {
            const data = d.data as any;
            return {
                reviewId: String(data.reviewId || d.id),
                uid: String(data.uid || ""),
                rating: typeof data.rating === "number" ? data.rating : 0,
                comment: String(data.comment || ""),
                createdAt: data.createdAt,
            }
        })
    }
}

export async function listAllReviews(opts: { limit: number }): Promise<BookingReviewsListAllOutput> {
    const db = getDb();

    const snap = await db.collection("reviews")
        .orderBy("createdAt", "desc")
        .limit(opts.limit)
        .get()

    return {
        reviews: snap.docs.map((d) => {
            const data = d.data() as any;
            return {
                reviewId: String(data.reviewId || d.id),
                stayId: String(data.stayId || ""),
                uid: String(data.udi || ""),
                rating: typeof data.rating === "number" ? data.rating : 0,
                comment: String(data.comment || ""),
                createdAt: data.createdAt,
            }
        })
    }
}



