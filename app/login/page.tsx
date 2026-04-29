import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/"
        forceRedirectUrl="/"
      />
    </main>
  );
}
