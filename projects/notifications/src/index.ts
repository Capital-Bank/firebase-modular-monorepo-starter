import { onCall, onRequest } from "firebase-functions/v2/https";

import { get401Error, routeCallable, routeHttp } from "@starter/common";

/**
 * `subscribers_notifications` is a single HTTP gateway for Pub/Sub push deliveries.
 *
 * We keep routing explicit via `subscriberRoutes` instead of auto-routing based on files:
 * - prevents accidentally exposing internal modules as public subscriber endpoints
 * - makes it obvious in reviews which endpoints can be invoked externally
 * - avoids turning refactors (renames/moves) into behavior changes
 */
export const subscribers_notifications = onRequest(async (request, response) => {
  await routeHttp({
    kind: "subscribers",
    prefix: "/subscribers_notifications",
    request,
    response,
    routes: subscriberRoutes,
    unauthorized: get401Error,
  });
  return;
});

export const api_notifications = onCall(async (request) => {
  return routeCallable({
    request,
    routes: apiRoutes,
    unauthorized: get401Error,
    executeOnCallFunction: async (_funcName, _request, executableFunc, isAnonymous) => {
      if (!isAnonymous && !_request.auth) {
        return Promise.reject(get401Error("Endpoint requires authentication"));
      }
      return await executableFunc(_request);
    },
  });
});
const subscriberRoutes = {
  notificationSend: {
    load: () => import("./endpoints/pubsub/notificationSend"),
    handler: (m: any) => m.notificationSend,
  },

} as const;

const apiRoutes = {
  notificationList: {
    load: () => import("./endpoints/api/notificationList"),
    handler: (m: any) => m.notificationList,
    anonymous: true,
  },
} as const;