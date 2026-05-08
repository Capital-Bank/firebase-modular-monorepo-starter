import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { seedReviews } from "../../orm/reviewsOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.reviewSeed;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function reviewSeed(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  return await seedReviews(params);
}

function validateParams(input: unknown): Params {
  if (!input || typeof input !== "object") throw get400Error("Invalid params");

  const numberOfStays = (input as any).numberOfStays;
  const reviewsPerStay = (input as any).reviewsPerStay;

  if (typeof numberOfStays !== "number" || !Number.isInteger(numberOfStays) || numberOfStays < 1 || numberOfStays > 50) {
    throw get400Error("numberOfStays must be an integer between 1 and 50");
  }
  if (typeof reviewsPerStay !== "number" || !Number.isInteger(reviewsPerStay) || reviewsPerStay < 1 || reviewsPerStay > 20) {
    throw get400Error("reviewsPerStay must be an integer between 1 and 20");
  }

  return { numberOfStays, reviewsPerStay };
}
