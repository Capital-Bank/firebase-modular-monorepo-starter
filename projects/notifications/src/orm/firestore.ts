import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let initialized = false;

export function getDb() {
  if (!initialized) {
    initializeApp();
    initialized = true;
  }
  return getFirestore();
}
