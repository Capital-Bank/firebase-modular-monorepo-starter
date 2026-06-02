import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { listStayEvents } from "../../orm/staysOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.stayEventsList;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function stayEventsList(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);

  try {
    const events = await listStayEvents(params);
    return { events };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list stay events";
    throw get400Error(message);
  }
}

function validateParams(input: unknown): Params {
  if (!input || typeof input !== "object") {
    throw get400Error("Invalid params");
  }

  const keys = Object.keys(input as Record<string, unknown>);
  for (const key of keys) {
    if (key !== "stayId") {
      throw get400Error(`Unknown param: ${key}`);
    }
  }

  const stayId = (input as any).stayId;
  if (typeof stayId !== "string" || !stayId.trim()) {
    throw get400Error("stayId is required");
  }

  return { stayId: stayId.trim() };
}
