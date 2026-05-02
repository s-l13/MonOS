import Sidebar from "@/components/sidebar";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/page-header";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { updateProfile } from "./actions";
import BackgroundPicker from "./BackgroundPicker";

export default async function ProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const email = user.emailAddresses[0]?.emailAddress ?? "-";

  const [profile] = await db
    .select({ background_preference: profiles.background_preference })
    .from(profiles)
    .where(eq(profiles.id, userId));

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10">
        <div className="mx-auto max-w-2xl space-y-6">
          <PageHeader
            title="الملف الشخصي"
            description="إدارة بياناتك الشخصية"
          />

          <Card>
            <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-700">
              <img
                src={user.imageUrl}
                alt="صورة الملف الشخصي"
                className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-700"
              />
              <div className="text-center">
                <p className="text-xl font-semibold text-gray-100">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-1 text-sm text-gray-400">{email}</p>
              </div>
            </div>

            <form action={updateProfile} className="mt-6 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الاسم الأول</label>
                <input
                  name="firstName"
                  type="text"
                  defaultValue={user.firstName ?? ""}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">الاسم الأخير</label>
                <input
                  name="lastName"
                  type="text"
                  defaultValue={user.lastName ?? ""}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-gray-100 outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
                >
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-gray-400">تخصيص خلفية الموقع</h2>
            <BackgroundPicker currentBg={profile?.background_preference ?? "default"} />
          </Card>
        </div>
      </main>
    </div>
  );
}
