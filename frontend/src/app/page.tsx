import { serverGet, PageResult, Division, Offering } from "@/lib/api";
import { Home } from "@/components/home";
export default async function HomePage() {
  const [divisions, offerings, faqs, businesses] = await Promise.all([
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
    serverGet<
      PageResult<{
        id: number;
        name: string;
        address: string;
        area: string;
        division_slug: string;
      }>
    >("organizations/"),
  ]);
  return (
    <Home
      divisions={divisions?.results || []}
      offerings={offerings?.results || []}
      faqs={faqs?.results || []}
      online={!!divisions}
      businesses={businesses?.results || []}
    />
  );
}
