import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

// Entry point for the field operations portal. Routes the responder to their own
// unit workspace, or to sign-in when there is no active rescuer session.
export default async function RescuerIndexPage() {
  const session = await getSession();

  if (session?.role === "rescuer" && session.rescuerId) {
    redirect(`/rescuer/${encodeURIComponent(session.rescuerId)}`);
  }

  redirect("/rescuer/login");
}
