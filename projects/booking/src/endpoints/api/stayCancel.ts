import { randomUUID } from 'node:crypto';
import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { cancelStay } from "../../orm/staysOrm";
import { publishJson } from "../../pubsub";

const apiEndpoint = BOOKING_API_ENDPOINTS.stayCancel;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function stayCancel(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);

  try {
    const result = await cancelStay(params);
    await publishJson("notification.ready_to_send", {
      eventId: randomUUID(),
      stayId: params.stayId,
      uid: "demo-user",
      template: "stay_cancelled",
      payload: {
        reason: params.reason ??  null
      }
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel stay";
    throw get400Error(message);
  }
}

function validateParams(input: unknown): Params {
  if (!input || typeof input !== "object") {
    throw get400Error("Invalid params");
  }

  const keys = Object.keys(input as Record<string, unknown>);
  for (const key of keys) {
    if (key !== "stayId" && key !== "reason") {
      throw get400Error(`Unknown param: ${key}`);
    }
  }

  const stayId = (input as any).stayId;
  if (typeof stayId !== "string" || !stayId.trim()) {
    throw get400Error("stayId is required");
  }
  const reason = (input as any).reason
  if(reason !== undefined && typeof reason !== "string"){
    throw get400Error("reason must be string")
  }
  

  return { 
    stayId: stayId.trim(),
    reason: typeof reason === "string" ? reason.trim() : undefined
  };
}
