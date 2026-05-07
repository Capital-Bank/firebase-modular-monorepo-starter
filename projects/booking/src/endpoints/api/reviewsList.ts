import type {CallableRequest} from "firebase-functions/v2/https";

import {get400Error} from "../../utils";
import {BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap} from "../../types";
import {listReviews} from "../../orm/reviewsOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.reviewsList;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type InputParams = InOut["input"];
type Result = InOut["output"];

export async function reviewsList(request: CallableRequest<any>): Promise<Result> {
    const params = validateParams(request.data);
    return await listReviews(params);
}

function validateParams(input: unknown): InputParams {
    if (!input || typeof input !== "object") throw get400Error("Invalid params");

    const {stayId} = input as any;

    if (typeof stayId !== "string" || !stayId.trim()) throw get400Error("Invalid stayId");

    return {stayId: stayId.trim()};
}