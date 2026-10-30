import { UiText } from "@/components/ui-text";
import { notFound } from "next/navigation";
import { serverGet } from "@/lib/api";
import { Text } from "@/components/provider";
import { AboutPage } from "@/components/about-page";
type Page = {
  title: string;
  title_bn: string;
  body: string;
  body_bn: string;
  description: string;
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "about")
    return {
      title: "About U Service BD",
      description: "Our story, mission and connected services in Bangladesh.",
    };
  const page = await serverGet<Page>(`pages/${encodeURIComponent(slug)}/`);
  return { title: page?.title || "Page", description: page?.description };
}
export default async function Content({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug === "about") return <AboutPage />;
  const page = await serverGet<Page>(`pages/${encodeURIComponent(slug)}/`);
  if (!page) notFound();
  return (
    <div className="page-wrap">
      <span className="eyebrow">
        <UiText text={"U SERVICE BD"} />
      </span>
      <h1>
        <Text bn={page.title_bn} en={page.title} />
      </h1>
      <div className="prose">
        <Text bn={page.body_bn || page.body} en={page.body} />
      </div>
    </div>
  );
}
