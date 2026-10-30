import { serverGet, Area, PageResult, Division, Offering } from "@/lib/api";
import { Home } from "@/components/home";
export default async function HomePage() {
  const [divisionsResult, faqsResult, serviceResults, areasResult] = await Promise.all([
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
    Promise.all(
      ["services", "electrician", "mechanic"].map((division) =>
        serverGet<PageResult<Offering>>(`offerings/?division=${division}`),
      ),
    ),
    serverGet<PageResult<Area>>("areas/?page_size=500"),
  ]);
  const divisions = divisionsResult?.results || [];
  const offerings = serviceResults
    .flatMap((result) => result?.results || [])
    .filter((offering) => ["services", "electrician", "mechanic"].includes(offering.division_slug));
  return (
    <Home
      divisions={divisions}
      faqs={faqsResult?.results || []}
      offerings={offerings}
      areas={areasResult?.results || []}
      online={!!divisionsResult}
    />
  );
}
