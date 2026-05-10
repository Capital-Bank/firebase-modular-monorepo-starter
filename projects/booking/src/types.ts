export * from "@starter/common";

export type StayStatus = "pending" | "confirmed" | "cancelled" | "expired";

export type StayDocument = {
  stayId: string;
  uid: string;
  petName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: StayStatus;
  averageRating?: number;
  reviewCount?: number;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  expiresAt: FirebaseFirestore.Timestamp;
};

export type ReviewDocument = {
  reviewId: string;
  stayId: string;
  uid: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
}
