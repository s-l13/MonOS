import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <SignUp
        afterSignUpUrl="/account-status"
        redirectUrl="/account-status"
        fallbackRedirectUrl="/account-status"
        signInUrl="/login"
      />
    </main>
  );
}
