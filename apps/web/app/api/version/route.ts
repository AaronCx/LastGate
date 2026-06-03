import { NextResponse } from "next/server";
import { ENGINE_VERSION } from "@lastgate/engine";

export const dynamic = "force-dynamic";

/**
 * Reports the engine version this deployment actually serves. Lets a drift
 * guard (and anyone) confirm the live gate matches the repo, so a stale deploy
 * is detectable instead of inferred (see lastgate-deploy-drift-pr).
 */
export function GET() {
  return NextResponse.json({
    name: "@lastgate/engine",
    engineVersion: ENGINE_VERSION,
  });
}
