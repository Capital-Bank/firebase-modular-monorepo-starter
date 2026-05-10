import { FieldValue} from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";

import { getDb } from "./firestore";
import {BookingReviewsListOutput, type ReviewDocument} from "../types";
import type {
    BookingReviewCreateInput,
    BookingReviewsListAllOutput,
    BookingReviewSeedOutput,
    BookingReviewsListInput,
    BookingReviewFilteredOutput
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
        .collection("stays").doc(opts.stayId)
        .collection("reviews").doc(reviewId);

    const topColRef = db.
        collection('reviews').doc(reviewId);

    const existingSnap = await db
        .collection("stays").doc(opts.stayId)
        .collection("reviews")
        .get(); // get all of the reviews for this stay

    const existingRatings = existingSnap.docs.map((d) =>
    {
        const data = d.data() as any;
        return typeof data.rating === "number" ? data.rating : 0;
    });

    const allRatings = [...existingRatings, opts.rating];
    const averageRatings = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length; // explain later
    const reviewCount = allRatings.length;


    const batch = db.batch();
    batch.set(subColRef, doc)
    batch.set(topColRef, doc);
    batch.update(db.collection("stays").doc(opts.stayId), {
        averageRating: Math.round(averageRatings * 10) / 10,
        reviewCount,
        updatedAt: FieldValue.serverTimestamp(),
    }); // update average rating in stay collection for particula stay

    await batch.commit();

    return { reviewId }
}
// list review per stay
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
// list all reviews
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

const PET_NAMES = ["Buddy", "Luna", "Milo", "Bella", "Charlie", "Max", "Daisy", "Rocky"];

// Rating distribution per stay tier so queries return meaningful results:
// tier 0 = top-rated (all 5s), tier 1 = high (4-5), tier 2 = mixed (3-4),
// tier 3 = mixed low (2-3), tier 4 = low (1-2), tier 5 = bottom (all 1s)
const RATING_POOLS: Record<number, Array<1 | 2 | 3 | 4 | 5>> = {
    0: [5, 5, 5, 5, 5],
    1: [4, 4, 5, 5, 4],
    2: [3, 3, 4, 3, 4],
    3: [2, 3, 2, 3, 2],
    4: [1, 2, 1, 2, 1],
    5: [1, 1, 1, 1, 1],
};

export async function seedReviews(opts: {
    numberOfStays: number;
    reviewsPerStay: number;
}): Promise<BookingReviewSeedOutput> {
    const db = getDb();
    const stayIds: string[] = [];
    const tiers = Object.keys(RATING_POOLS).length;
    let reviewsCreated = 0;

    for (let i = 0; i < opts.numberOfStays; i++) {
        const stayId = randomUUID();
        stayIds.push(stayId);

        const petName = PET_NAMES[i % PET_NAMES.length];
        const tier = i % tiers;
        const ratingPool = RATING_POOLS[tier];

        const ratingsForStay = Array.from({length: opts.reviewsPerStay}, (_, j) => ratingPool[j % ratingPool.length]);
        const averageRating = Math.round((ratingsForStay.reduce((sum, r) => sum + r, 0) / ratingsForStay.length) * 10) / 10 ;
// return to this later, give a good look and why not with number of reviews and why fixed 10 or becuase is seeder.
        // Write the stay document directly — seeder bypasses business logic validation
        const stayRef = db.collection("stays").doc(stayId);
        await stayRef.set({
            stayId,
            uid: `seed-user-${i}`,
            petName,
            startDate: "2026-05-01",
            endDate: "2026-05-07",
            status: "confirmed",
            averageRating,
            reviewCount: opts.reviewsPerStay,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            expiresAt: null,
        });

        // Write reviews for this stay
        const batch = db.batch();
        for (let j = 0; j < opts.reviewsPerStay; j++) {
            const reviewId = randomUUID();
            const rating = ratingPool[j % ratingPool.length];
            const doc: ReviewDocument = {
                reviewId,
                stayId,
                uid: `seed-user-${i}`,
                rating,
                comment: `Seeded review ${j + 1} for ${petName} — tier ${tier}`,
                createdAt: FieldValue.serverTimestamp(),
            };

            batch.set(
                stayRef.collection("reviews").doc(reviewId),
                doc,
            );
            batch.set(
                db.collection("reviews").doc(reviewId),
                doc,
            );
            reviewsCreated++;
        }
        await batch.commit();
    }

    return {staysCreated: opts.numberOfStays, reviewsCreated, stayIds};
}

export async function listFilteredReviews(opts: {
    minRating: number;
    maxRating: number;
    limit: number;
}): Promise<BookingReviewFilteredOutput> {
    const db = getDb();

    // Note: we filter on field and orderBy field
    console.log('min:', opts.minRating, 'max', opts.maxRating)

    const snap = await db.collection('reviews')
        .where("rating", ">=", opts.minRating)
        .where("rating", "<=", opts.maxRating)
        .orderBy("rating", "desc")
        .limit(opts.limit)
        .get();

    return {
        reviews: snap.docs.map((d) => {
            const data = d.data() as any;
            return {
                reviewId: String(data.reviewId || d.id),
                stayId: String(data.stayId || ""),
                uid: String(data.uid || ""),
                rating: typeof data.rating === "number" ? data.rating : 0,
                comment: String(data.comment || ""),
                createdAt: data.createdAt,
            };
        }),
    };
}

