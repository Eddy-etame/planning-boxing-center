import { NextResponse } from "next/server";
import { initialPlannings, coachColors, activityColors, gyms } from "@/data/plannings";

export async function GET() {
  return NextResponse.json({
    plannings: initialPlannings,
    coachColors,
    activityColors,
    gyms
  });
}
