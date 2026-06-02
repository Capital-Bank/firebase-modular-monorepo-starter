import type { CallableRequest } from "firebase-functions/v2/https";

import {
  get400Error,
  NOTIFICATIONS_API_ENDPOINTS,
  type NotificationsApiEndpointTypeMap,
} from "@starter/common";
import { listNotifications } from "../../orm/notificationsOrm";

const apiEndpoint = NOTIFICATIONS_API_ENDPOINTS.notificationsList;
type InOut = NotificationsApiEndpointTypeMap[typeof apiEndpoint];
type Params = InOut["input"];
type Result = InOut["output"];

export async function notificationList(request: CallableRequest<any>): Promise<Result> {
  const params = validateParams(request.data);
  return await listNotifications(params);
}

function validateParams(input: unknown): Required<Pick<Params, "limit" | "sortBy" | "sortDirection">> & Params {
  if (input == null) {
    return {
      limit: 20,
      sortBy: "createdAt",
      sortDirection: "desc",
    };
  }

  if (typeof input !== "object") {
    throw get400Error("Invalid params");
  }

  const data = input as any;

  const limit = data.limit ?? 20;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw get400Error("limit must be an integer between 1 and 100");
  }

  const sortBy = data.sortBy ?? "createdAt";
  if (sortBy !== "createdAt" && sortBy !== "template" && sortBy !== "status") {
    throw get400Error("Invalid sortBy");
  }

  const sortDirection = data.sortDirection ?? "desc";
  if (sortDirection !== "asc" && sortDirection !== "desc") {
    throw get400Error("Invalid sortDirection");
  }

  const cursor = data.cursor;
  if (cursor !== undefined && typeof cursor !== "string") {
    throw get400Error("cursor must be a string");
  }

  const search = data.search;
  if (search !== undefined && typeof search !== "string") {
    throw get400Error("search must be a string");
  }

  const status = data.status;
  if (
    status !== undefined &&
    status !== "sent" &&
    status !== "failed" &&
    status !== "received"
  ) {
    throw get400Error("Invalid status");
  }

  const template = data.template;
  if (template !== undefined && template !== "stay_cancelled") {
    throw get400Error("Invalid template");
  }

  const stayId = data.stayId;
  if (stayId !== undefined && typeof stayId !== "string") {
    throw get400Error("stayId must be a string");
  }

  const uid = data.uid;
  if (uid !== undefined && typeof uid !== "string") {
    throw get400Error("uid must be a string");
  }

  return {
    limit,
    sortBy,
    sortDirection,
    cursor: cursor?.trim(),
    search: search?.trim(),
    status,
    template,
    stayId: stayId?.trim(),
    uid: uid?.trim(),
  };
}