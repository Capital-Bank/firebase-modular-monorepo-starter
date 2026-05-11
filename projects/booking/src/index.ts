import {onCall} from "firebase-functions/v2/https";

import {get401Error, routeCallable} from "@starter/common";

/**
 * `api_booking` is a single callable gateway that hosts multiple internal endpoints.
 *
 * Routing is intentionally explicit and declarative:
 * - every exposed endpoint must be listed in `apiRoutes`
 * - we do NOT auto-route based on files/folders
 *
 * Risks of automatic routing:
 * - accidental exposure of internal/debug/admin modules as public endpoints
 * - auth/anonymous requirements applied inconsistently
 * - file renames/moves become behavior changes
 * - reviewers lose a single obvious allowlist to audit
 */
export const api_booking = onCall(async (request) => {
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

const apiRoutes = {
    hello: {
        load: () => import("./endpoints/api/hello"),
        handler: (m: any) => m.hello,
        anonymous: true,
    },
    availabilityList: {
        load: () => import("./endpoints/api/availabilityList"),
        handler: (m: any) => m.availabilityList,
        // V1: keep this callable easy to test via curl in emulators.
        // When we introduce auth in the starter, flip this to `false` and update the spec accordingly.
        anonymous: true,
    },
    availabilitySeed: {
        load: () => import("./endpoints/api/availabilitySeed"),
        handler: (m: any) => m.availabilitySeed,
        anonymous: true,
    },
    stayRequestCreate: {
        load: () => import("./endpoints/api/stayRequestCreate"),
        handler: (m: any) => m.stayRequestCreate,
        anonymous: true,
    },
    staysList: {
        load: () => import("./endpoints/api/staysList"),
        handler: (m: any) => m.staysList,
        anonymous: true,
    },
    stayCancel: {
        load: () => import("./endpoints/api/stayCancel"),
        handler: (m:any) => m.stayCancel,
        anonymous: true,
    },
    reviewCreate: {
        load: () => import("./endpoints/api/reviewCreate"),
        handler: (m: any) => m.reviewCreate,
        anonymous: true,
    },
    reviewsList: {
        load: () => import("./endpoints/api/reviewsList"),
        handler: (m: any) => m.reviewsList,
        anonymous: true,
    },
    reviewsListAll: {
        load: () => import("./endpoints/api/reviewsListAll"),
        handler: (m: any) => m.reviewsListAll,
        anonymous: true,
    },
    reviewSeed: {
        load: () => import("./endpoints/api/reviewSeed"),
        handler: (m: any) => m.reviewSeed,
        anonymous: true,
    },
    reviewsFiltered: {
        load: () => import("./endpoints/api/reviewsFiltered"),
        handler: (m: any) => m.reviewsFiltered,
        anonymous: true,
    },
    staysByRating: {
        load: () => import("./endpoints/api/staysByRating"),
        handler: (m: any) => m.staysByRating,
        anonymous: true,
    },

} as const;
