import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();

    // Leitura extremamente leve para "acordar" o banco
    const { error } = await supabase.from("sorteios").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "Error",
          date: new Date().toISOString(),
          message: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "Alive",
      date: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "Error",
        date: new Date().toISOString(),
        message: err?.message || "Erro inesperado",
      },
      { status: 500 }
    );
  }
}

