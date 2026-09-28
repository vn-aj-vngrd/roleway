export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.AGENT_OTEL_ENABLED === "true"
  ) {
    const { registerOTel } = await import("@vercel/otel");
    registerOTel("roleway-agent");
  }
}
