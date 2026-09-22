"use client";

import { doc, increment, updateDoc } from "firebase/firestore";
import { useEffect } from "react";

import { db } from "@/lib/firebase";

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
      .catch(() => {
        window.sessionStorage.removeItem(storageKey);
      });
  }, [topicId]);

  return null;
}
