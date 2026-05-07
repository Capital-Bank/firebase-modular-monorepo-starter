import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { createReview } from "../../orm/reviewsOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.reviewCreate;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type InputParams = InOut["input"];
type Result = InOut["output"];

export async function reviewCreate(request: CallableRequest<any>): Promise<Result> {
    const params= validateParams(request.data);
    return await createReview(params);
}

function validateParams(input:unknown): InputParams {

    if (!input || typeof input !== "object") throw get400Error("invalid param");

    const {stayId, uid, rating, comment} = input as any;

    if (typeof stayId !== "string" || !stayId.trim()) throw get400Error("stayId is required");
    if (typeof uid !== "string" || !uid.trim()) throw get400Error("invalid is required");
    if (typeof comment !== "string" || !comment.trim() ) throw get400Error("comment is required");
    if (![1,2,3,4,5].includes(rating) ) throw get400Error("rating must be 1-5 ");

    return { stayId: stayId.trim(), uid: uid.trim(), rating: rating as 1 | 2 | 3 | 4 | 5, comment: comment.trim() };
}