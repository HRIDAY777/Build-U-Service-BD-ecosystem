import { serverGet, PageResult, Division, Offering } from "@/lib/api";
import { Home } from "@/components/home";
export default async function HomePage() {
  const [divisions, offerings, faqs] = await Promise.all([
    serverGet<PageResult<Division>>("divisions/"),
    serverGet<PageResult<Offering>>("offerings/"),
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
      offerings={offerings?.results || []}
      faqs={faqs?.results || []}
      online={!!divisions}
    />
  );
}
