type Props = {
  searchParams: Promise<{
    status?: string;
  }>;
};

export default async function AccountStatusPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "pending";

  const content = getStatusContent(status);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-100">{content.title}</h1>
        <p className="mt-3 text-gray-400">{content.description}</p>
      </div>
    </main>
  );
}

function getStatusContent(status: string) {
  switch (status) {
    case "approved":
      return {
        title: "الحساب معتمد",
        description: "تم اعتماد حسابك ويمكنك استخدام النظام بشكل طبيعي.",
      };

    case "rejected":
      return {
        title: "تم رفض الحساب",
        description:
          "تم رفض طلب الوصول لهذا الحساب. راجع السوبر أدمن إذا كنت ترى أن ذلك حدث بالخطأ.",
      };

    case "disabled":
      return {
        title: "الحساب معطل",
        description:
          "تم تعطيل هذا الحساب مؤقتًا أو نهائيًا. تواصل مع السوبر أدمن لمعرفة السبب.",
      };

    case "pending":
    default:
      return {
        title: "الحساب قيد المراجعة",
        description:
          "تم إنشاء الحساب بنجاح، لكن ما زال بانتظار اعتماد السوبر أدمن قبل السماح بالدخول.",
      };
  }
}
