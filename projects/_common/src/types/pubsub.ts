export type StayCreatedPayload = {
    eventId: string;
    uid: string;
    stayId: string;
}

export type ReviewCreatedPayload = {
    eventId: string;
    uid: string;
    stayId: string;
    reviewId: string;
    rating: number;
}