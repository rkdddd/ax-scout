// Design Ref: DESIGN §1.2 — /contests/new 공모전 등록 화면
import ContestForm from "../contest-form";

export default function NewContestPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">새 공모전 등록</h1>
      <ContestForm />
    </main>
  );
}
