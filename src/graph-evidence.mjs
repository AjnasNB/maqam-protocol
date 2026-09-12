import { keccak256, toUtf8Bytes } from "ethers";

export function validateGraphEvidence(packet) {
  if (!packet.graphEvidence) return;
  const e = packet.graphEvidence;
  const hash = keccak256(toUtf8Bytes(JSON.stringify(e.snapshot)));
  if (
    hash !== e.snapshotHash ||
    !packet.note?.endsWith(`Graph agent: ${e.agentId}\nGraph snapshot: ${hash}`)
  )
    throw new Error("Graph evidence does not match the signed note.");
  const agent = e.snapshot?.agents?.find((a) => a.id === e.agentId);
  if (
    !agent?.agentWallet ||
    agent.agentWallet.toLowerCase() !==
      packet.authorization.recipient.toLowerCase() ||
    e.wallet.toLowerCase() !== packet.authorization.recipient.toLowerCase()
  )
    throw new Error(
      "Graph evidence wallet differs from the payment recipient.",
    );
}
