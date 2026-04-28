import { redirect } from "next/navigation";

// Password reset is handled inside Clerk's SignIn component.
// Redirect anyone who hits this URL directly.
export default function ForgotPasswordPage() {
  redirect("/login");
}
