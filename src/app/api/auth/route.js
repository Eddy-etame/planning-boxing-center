import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
    }

    // Standardize password format to lowercase for verification comparison
    const cleanedPassword = password.trim().toLowerCase();

    // Check admin first
    const adminPass = process.env.COACH_ADMIN || "admin2026@bc!";
    if (cleanedPassword === adminPass.toLowerCase()) {
      const response = NextResponse.json({ success: true, role: "admin", name: "Administrateur" });
      response.cookies.set("bc_session", JSON.stringify({ role: "admin", name: "admin" }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      return response;
    }

    // Check coaches
    let matchedCoach = null;
    for (const key of Object.keys(process.env)) {
      if (key.startsWith("COACH_") && key !== "COACH_ADMIN") {
        const envVal = process.env[key];
        if (envVal && envVal.toLowerCase() === cleanedPassword) {
          matchedCoach = key.replace("COACH_", "").toUpperCase();
          break;
        }
      }
    }

    if (matchedCoach) {
      const response = NextResponse.json({ success: true, role: "coach", name: matchedCoach });
      response.cookies.set("bc_session", JSON.stringify({ role: "coach", name: matchedCoach }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });
      return response;
    }

    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET(request) {
  // Logout route or session check
  const sessionCookie = request.cookies.get("bc_session");
  if (!sessionCookie) {
    return NextResponse.json({ authenticated: false });
  }
  try {
    const data = JSON.parse(sessionCookie.value);
    return NextResponse.json({ authenticated: true, ...data });
  } catch (e) {
    return NextResponse.json({ authenticated: false });
  }
}

export async function DELETE(request) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("bc_session");
  return response;
}
