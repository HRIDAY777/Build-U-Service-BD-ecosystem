import { serverGet, PageResult, Division } from "@/lib/api";
import { Home } from "@/components/home";
export default async function HomePage() {
  const [divisions, faqs] = await Promise.all([
    serverGet<PageResult<Division>>("divisions/"),
    serverGet<
      PageResult<{
        id: number;
        question: string;
        question_bn: string;
        answer: string;
        answer_bn: string;
      }>
    >("faqs/"),
  ]);
  return (
    <Home
      divisions={divisions?.results || []}
      faqs={faqs?.results || []}
      online={!!divisions}
    />
  );
}
