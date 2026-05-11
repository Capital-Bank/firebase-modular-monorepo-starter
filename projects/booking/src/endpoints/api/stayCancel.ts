import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { cancelStay } from "../../orm/staysOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.stayCancel;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function stayCancel(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  return await cancelStay(params);
}

function validateParams(input: unknown): Params {
  if (!input || typeof input !== "object") throw get400Error("Invalid params");

  const stayId = (input as any).stayId;
  if (typeof stayId !== "string" || !stayId.trim()) throw get400Error("stayId is required");

  return { stayId: stayId.trim() };
}
