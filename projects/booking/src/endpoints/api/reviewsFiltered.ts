import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { listFilteredReviews } from "../../orm/reviewsOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.reviewsFiltered;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Result = InOut["output"];

export async function reviewsFiltered(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  return await listFilteredReviews(params);
}

function validateParams(input: unknown): { minRating: number; maxRating: number; limit: number } {
  if (input == null) return { minRating: 1, maxRating: 5, limit: 20 };
  if (typeof input !== "object") throw get400Error("Invalid params");

  const raw = input as any;

  const minRating = (raw.minRating ?? 1) as 1 | 2| 3 | 4 | 5;
  const maxRating = (raw.maxRating ?? 5) as 1 | 2| 3 | 4 | 5;
  const limit = (raw.limit ?? 20) as number;

  if (![1, 2, 3, 4, 5].includes(minRating)) throw get400Error("minRating must be 1–5");
  if (![1, 2, 3, 4, 5].includes(maxRating)) throw get400Error("maxRating must be 1–5");
  if (minRating > maxRating) throw get400Error("minRating must be <= maxRating");
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw get400Error("limit must be an integer between 1 and 100");
  }

  return { minRating, maxRating, limit };
}
