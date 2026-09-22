"use client";

import { doc, increment, updateDoc } from "firebase/firestore";
import { useEffect } from "react";

import { db } from "@/lib/firebase";
import { logFirestoreError } from "@/lib/firestoreDebug";

export function TopicViewTracker({ topicId }: { topicId: string }) {
  useEffect(() => {
    const storageKey = `forum-pixel:view:${topicId}`;

    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, "pending");

    void updateDoc(doc(db, "topics", topicId), {
      views: increment(1),
    })
      .then(() => {
        window.sessionStorage.setItem(storageKey, "counted");
      })
      .catch((error) => {
        logFirestoreError("topics.incrementViews", error, { topicId });
        window.sessionStorage.removeItem(storageKey);
      });
  }, [topicId]);

  return null;
}
