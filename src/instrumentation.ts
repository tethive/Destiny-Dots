/** Runs once when the server starts. Fails fast on missing production configuration. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertProductionEnv } = await import("@/lib/env");
  assertProductionEnv();
}
