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
  stayDetails: "stayDetails",
  stayNoteCreate: "stayNoteCreate",
  stayNotesList: "stayNotesList",
  stayEventsList: "stayEventsList"
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

export type BookingStayCancelInput = {
  stayId: string;
  reason?: string
};

export type BookingStayCancelOutput = {
  stayId: string;
  status: "cancelled";

};

export type BookingStayDetailsInput = {
  stayId: string;
};

export type BookingStayDetailsOutput = {
  stay: {
    stayId: string;
    uid: string;
    petName: string;
    startDate: string;
    endDate: string;
    status: "pending" | "confirmed" | "cancelled" | "expired";
    createdAt?: unknown;
  };
};

export type BookingStayNoteCreateInput = {
  stayId: string
  text: string
}

export type BookingStayNoteCreateOutput = {
  stayId: string
  noteId: string
}

export type BookingStayNotesListInput = {
  stayId: string;
};

export type BookingStayNotesListOutput = {
  notes: Array<{
    noteId: string;
    stayId: string;
    text: string;
    createdAt?: unknown;
  }>;
};
export type BookingStayEventsListInput = {
  stayId: string;
};

export type BookingStayEventsListOutput = {
  events: Array<{
    eventId:string
    type: string;
    stayId:string
    reason: string;
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
  [BOOKING_API_ENDPOINTS.stayCancel]: ApiEndpointDef<
    BookingStayCancelInput,
    BookingStayCancelOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.stayDetails]: ApiEndpointDef<
    BookingStayDetailsInput,
    BookingStayDetailsOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.stayNoteCreate]: ApiEndpointDef<
    BookingStayNoteCreateInput,
    BookingStayNoteCreateOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.stayNotesList]: ApiEndpointDef<
    BookingStayNotesListInput,
    BookingStayNotesListOutput,
    "anonymous"
  >;
  [BOOKING_API_ENDPOINTS.stayEventsList]: ApiEndpointDef<
    BookingStayEventsListInput,
    BookingStayEventsListOutput,
    "anonymous"
  >;
}

// ---- notifications (callable) -----------------------------------------------------

export const  NOTIFICATIONS_API_ENDPOINTS = {
  notificationsList: "notificationsList"
} as const;



export type NotificationsApiEndpoint = (typeof NOTIFICATIONS_API_ENDPOINTS)[keyof typeof NOTIFICATIONS_API_ENDPOINTS];

export type NotificationSortField = "createdAt" | "template" | "status";
export type SortDirection = "asc" | "desc";
export type NotificationListInput = {
  limit?: number;
  cursor?: string;
  sortBy?: NotificationSortField;
  sortDirection?: SortDirection;
  search?: string;
  status?: "sent" | "failed" | "received";
  template?: "stay_cancelled";
  stayId?: string;
  uid?: string;
};

export type NotificationListOutput = {
  notifications: Array<{
    notificationId: string;
    stayId: string;
    uid: string;
    template: string;
    status: string;
    payload?: unknown;
    createdAt?: unknown;
  }>;
  nextCursor?: string;
};
export interface NotificationsApiEndpointTypeMap extends ApiEndpointTypeMap {
  [NOTIFICATIONS_API_ENDPOINTS.notificationsList]: ApiEndpointDef<
    NotificationListInput,
    NotificationListOutput,
    "anonymous"
  >;
  
}