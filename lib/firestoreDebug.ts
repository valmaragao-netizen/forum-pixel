import { FirebaseError } from "firebase/app";

type FirestoreDebugContext = Record<string, string | number | boolean | undefined>;

export function logFirestoreError(
  operation: string,
  error: unknown,
  context: FirestoreDebugContext = {},
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  const details = error instanceof FirebaseError
    ? { code: error.code, message: error.message }
    : { message: error instanceof Error ? error.message : String(error) };

  console.error(`[Firestore] operação negada ou falhou: ${operation}`, {
    ...details,
    context,
  });
}

export async function withFirestoreDebug<T>(
  operation: string,
  action: () => Promise<T>,
  context: FirestoreDebugContext = {},
) {
  try {
    return await action();
  } catch (error) {
    logFirestoreError(operation, error, context);
    throw error;
  }
}
