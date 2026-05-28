import type { CallableRequest } from "firebase-functions/v2/https";

import { get400Error } from "../../utils";
import { BOOKING_API_ENDPOINTS, type BookingApiEndpointTypeMap } from "../../types";
import { createStayNote } from "../../orm/staysOrm";

const apiEndpoint = BOOKING_API_ENDPOINTS.stayNoteCreate;
type InOut = BookingApiEndpointTypeMap[typeof apiEndpoint];
type InputParams = InOut["input"];
type Result = InOut["output"];

export async function stayNoteCreate(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  try {
     return await createStayNote(params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create stay note";
    throw get400Error(message);
  }
 
}

function validateParams(input: unknown): InputParams {
  if (!input || typeof input !== "object") throw get400Error("Invalid params");

  const keys = Object.keys(input as Record<string, unknown>)
  for(const key of keys){
    if (key !== "stayId" && key !== "text"){
        throw get400Error(`Unknown param: ${key}`)
    }
  }
  const stayId = (input as any).stayId;
  const text = (input as any).text;
  if(typeof stayId !== "string" || !stayId.trim()){
    throw get400Error("stayId is required")
  }
  if(typeof text !== "string" || !text.trim()){
    throw get400Error("text is required")
  }
  return { stayId: stayId.trim(), text: text.trim() };
}
