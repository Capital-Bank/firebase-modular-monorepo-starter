/**
 * Central endpoint type registry.
 *
 * This is the single source of truth for endpoint request/response types across workspaces.
 *
 * Why this exists:
 * - avoids scattering `type Params` / `type Result` across many endpoint files
 * - makes it feasible to generate documentation (e.g. OpenAPI) from one registry
 * - makes refactors safer: changing an endpoint contract is a single diff
 *
 * Note: In V1 we only model TypeScript types. A later step can attach JSON Schema metadata
 * per endpoint for straightforward OpenAPI generation.
 */

export type ApiEndpointDef<
  Input,
  Output,
  Auth extends "required" | "anonymous" = "required",
> = {
  input: Input;
  output: Output;
  auth: Auth;
  description?: string;
};

export type ApiEndpointTypeMap = Record<string, ApiEndpointDef<any, any, any>>;

// ---- booking (callable) -----------------------------------------------------

export const BOOKING_API_ENDPOINTS = {
  hello: "hello",
  availabilityList: "availabilityList",
  availabilitySeed: "availabilitySeed",
  stayRequestCreate: "stayRequestCreate",
  staysList: "staysList",
  stayCancel: "stayCancel",
  reviewCreate: "reviewCreate",
  reviewsList: "reviewsList",
  reviewsListAll: "reviewsListAll",
} as const;

export type BookingApiEndpoint = (typeof BOOKING_API_ENDPOINTS)[keyof typeof BOOKING_API_ENDPOINTS];

export type BookingAvailabilityListInput = {
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
};

export type BookingAvailabilityListOutput = {
  days: Array<{ date: string; capacity: number; reservedCount: number }>;
};

export type BookingAvailabilitySeedInput = {
  fromDate: string; // YYYY-MM-DD
  days: number;
  capacity: number;
};

export type BookingAvailabilitySeedOutput = {
  fromDate: string;
  toDate: string;
  daysWritten: number;
};

export type BookingStayRequestCreateInput = {
  uid?: string; // optional for V1 playground; defaults to "demo-user"
  petName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

export type BookingStayRequestCreateOutput = {
  stayId: string;
  status: "pending";
};

export type BookingStaysListInput = {
  limit?: number;
};

export type BookingStaysListOutput = {
  stays: Array<{
    stayId: string;
    uid: string;
    petName: string;
    startDate: string;
    endDate: string;
    status: "pending" | "confirmed" | "cancelled" | "expired";
    createdAt?: unknown;
  }>;
};

export type BookingReviewCreateInput = {
  stayId: string;
  uid: string;
  rating: 1 | 2 | 3| 4 | 5;
  comment: string;
};

export type BookingReviewsCreateOutput = {
  reviewId: string;
};

export type BookingReviewsListInput = {
  stayId: string;
};

export type BookingReviewsListOutput = {
  reviews: Array<{
    reviewId: string;
    uid: string;
    rating: number;
    comment: string;
    createdAt?: unknown;
  }>
};

export type BookingReviewsListAllInput = {
  limit?: number;
};

export type BookingReviewsListAllOutput = {
  reviews: Array<
      {
        reviewId: string;
        stayId: string;
        uid: string;
        rating: number;
        comment: string;
        createdAt?: unknown;
      }>;
};

export interface BookingApiEndpointTypeMap extends ApiEndpointTypeMap {
  [BOOKING_API_ENDPOINTS.hello]: ApiEndpointDef<{}, { ok: true; message: string }, "anonymous">;
  [BOOKING_API_ENDPOINTS.availabilityList]: ApiEndpointDef<
    BookingAvailabilityListInput,
    BookingAvailabilityListOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.availabilitySeed]: ApiEndpointDef<
    BookingAvailabilitySeedInput,
    BookingAvailabilitySeedOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.stayRequestCreate]: ApiEndpointDef<
    BookingStayRequestCreateInput,
    BookingStayRequestCreateOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.staysList]: ApiEndpointDef<
    BookingStaysListInput,
    BookingStaysListOutput,
    "anonymous"
  >;

  [BOOKING_API_ENDPOINTS.reviewCreate]: ApiEndpointDef<
      BookingReviewCreateInput,
      BookingReviewsCreateOutput,
      "anonymous"
  >;

  [BOOKING_API_ENDPOINTS.reviewsList]: ApiEndpointDef<
      BookingReviewsListInput,
      BookingReviewsListOutput,
      "anonymous"
  >;

  [BOOKING_API_ENDPOINTS.reviewsListAll]: ApiEndpointDef<
      BookingReviewsListAllInput,
      BookingReviewsListAllOutput,
      "anonymous"
  >;

  // Planned (spec-first) endpoints (to be implemented):
  [BOOKING_API_ENDPOINTS.stayCancel]: ApiEndpointDef<any, any, "anonymous">;
}
