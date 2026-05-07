import { FieldValue} from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import { getDb } from "./firestore";
import {BookingReviewsListInput, BookingReviewsListOutput, ReviewDocument} from "../types";
import type { BookingReviewCreateInput } from "@starter/common";


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
            rating: opts.rating,
            comment: opts.comment,
            createdAt: FieldValue.serverTimestamp(),
        };

    await db.collection("stays").doc(opts.stayId)
        .collection("reviews").doc(reviewId)
        .set(doc);

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



