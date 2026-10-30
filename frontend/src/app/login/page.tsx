import { LoginForm } from "@/components/forms";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ register?: string }>;
}) {
  const { register } = await searchParams;
  return (
    <div className="page-wrap">
      <LoginForm initialRegister={register === "1"} />
    </div>
  );
}
