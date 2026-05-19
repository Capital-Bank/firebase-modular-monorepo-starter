import { onRequest } from "firebase-functions/v2/https";

import {ensureSubscriptions, get401Error, routeHttp} from "@starter/common";

function getFunctionsBaseUrl(): string {
  const emulatorHost = process.env.FUNCTIONS_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HUB;
  if (emulatorHost || process.env.FUNCTIONS_EMULATOR === "true") {
    const project = process.env.GCLOUD_PROJECT ?? "demo-no-project";
    const region = process.env.FUNCTION_REGION ?? "us-central1";
    return `http://127.0.0.1:5001/${project}/${region}`;
  }
  const project = process.env.GCLOUD_PROJECT ?? "";
  const region = process.env.FUNCTION_REGION ?? "us-central1";
  return `https://${region}-${project}.cloudfunctions.net`;
}

/**
 * `subscribers_notifications` is a single HTTP gateway for Pub/Sub push deliveries.
 *
 * We keep routing explicit via `subscriberRoutes` instead of auto-routing based on files:
 * - prevents accidentally exposing internal modules as public subscriber endpoints
 * - makes it obvious in reviews which endpoints can be invoked externally
 * - avoids turning refactors (renames/moves) into behavior changes
 */
const subscriptionsReady = ensureSubscriptions(getFunctionsBaseUrl());

export const subscribers_notifications = onRequest({ invoker: "public" }, async (request, response) => {
  await subscriptionsReady;
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

const subscriberRoutes = {
  reviewCreated: {
    load: () => import("./endpoints/pubsub/reviewCreated"),
    handler: (m: any) => m.reviewCreated,
  },
} as const;
