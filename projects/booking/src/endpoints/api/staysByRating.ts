import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { listStaysByRating } from "../../orm/staysOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.staysByRating;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function staysByRating(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  const stays = await listStaysByRating(params);
  return { stays };
}

function validateParams(input: unknown): { order: "asc" | "desc"; limit: number } {
  if (!input || typeof input !== "object") throw get400Error("Invalid params");

  const order: Params["order"] = (input as any).order;
  const limit: Params["limit"] = (input as any).limit ?? 20;

  if (order !== "asc" && order !== "desc") throw get400Error("order must be 'asc' or 'desc'");
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw get400Error("limit must be an integer between 1 and 100");
  }

  return { order, limit };
}

