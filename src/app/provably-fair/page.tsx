import type { Metadata } from "next";
import ProvablyFair from "@/components/ProvablyFair";

export const metadata: Metadata = { title: "Provably fair | Sorteios do Soares" };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string; sorteio?: string }> }) {
  const { id, sorteio } = await searchParams;
  return <ProvablyFair key={`${id}-${sorteio}`} id={id ?? null} sorteio={sorteio ?? null} />;
}
