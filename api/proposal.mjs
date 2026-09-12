import { evaluateProposal } from "../src/governance.mjs";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (Number(req.headers["content-length"] || 0) > 4096)
    return res.status(413).json({ error: "Request too large" });
  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (
      !b ||
      typeof b.amount !== "string" ||
      b.amount.length > 40 ||
      typeof b.recipient !== "string" ||
      b.recipient.length > 42
    )
      return res.status(400).json({ error: "Invalid proposal" });
    const result = await evaluateProposal({
      chainId: b.chainId,
      recipient: b.recipient,
      amount: b.amount,
      maximum: "25000000",
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
