import { UnlockForm } from "@/components/unlock-form";

export default async function UnlockPage({ searchParams }: {searchParams:Promise<{next?:string}>}) {
  const requested = (await searchParams).next ?? "/";
  const nextPath = requested.startsWith("/") && !requested.startsWith("//") && !requested.startsWith("/api/") ? requested : "/";
  return <UnlockForm nextPath={nextPath} />;
}
