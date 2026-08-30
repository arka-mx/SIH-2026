/**
 * Verifies a Firebase / Google Identity Platform ID token server-side
 * without the Firebase Admin SDK — RS256 signature is checked against
 * Google's published public keys, plus issuer / audience / expiry.
 */
import { jwtVerify, createRemoteJWKSet } from "jose";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export interface FirebaseIdentity {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  if (!PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
  }

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });

  const uid = (payload.sub as string) || (payload.user_id as string) || "";
  if (!uid) throw new Error("ID token has no subject");

  return {
    uid,
    email: (payload.email as string) ?? "",
    name: (payload.name as string) || (payload.email as string) || "Rescuer",
    picture: (payload.picture as string) || undefined,
  };
}
