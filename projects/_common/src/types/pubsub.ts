export type NotificationReadyToSendPayload = {
  eventId: string;
  stayId: string;
  uid: string;
  template: "stay_cancelled";
  payload: {
    reason?: string | null;
  };
};