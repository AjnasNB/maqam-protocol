import { discoverAgents } from "../src/graph-agents.mjs";

export default async function handler(req, res, env = process.env) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (Number(req.headers?.["content-length"] || 0) > 4096)
    return res.status(413).json({ error: "Request too large" });
  let input;
  try {
    input = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  if (!input || typeof input.task !== "string")
    return res.status(400).json({ error: "A task is required" });
  try {
    return res
      .status(200)
      .json(
        await discoverAgents(input, {
          apiKey:
            Number(input.network) === 11155111
              ? env.GRAPH_SEPOLIA_API_KEY || env.GRAPH_API_KEY
              : env.GRAPH_API_KEY,
        }),
      );
  } catch (error) {
    return res.status(503).json({ error: error.message });
  }
}
