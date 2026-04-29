import { SignUp } from "@clerk/nextjs";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <SignUp
        routing="hash"
        fallbackRedirectUrl="/account-status"
        forceRedirectUrl="/account-status"
      />
    </main>
  );
}
