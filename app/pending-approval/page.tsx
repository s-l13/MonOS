export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-800 p-8 shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-100">الحساب قيد المراجعة</h1>
        <p className="mt-3 text-gray-400">
          تم استلام طلب التسجيل بنجاح، لكن لا يمكنك الدخول حتى يقوم السوبر أدمن بالموافقة على الحساب.
        </p>
      </div>
    </main>
  );
}
