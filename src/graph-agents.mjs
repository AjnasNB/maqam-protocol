import {
  getAddress,
  isAddress,
  ZeroAddress,
  keccak256,
  toUtf8Bytes,
} from "ethers";

// Official Agent0 deployments documented by The Graph. No caller-controlled URLs.
export const graphSources = {
  84532: {
    name: "Base Sepolia",
    id: "4yYAvQLFjBhBtdRCY7eUWo181VNoTSLLFd5M7FXQAi6u",
  },
  11155111: {
    name: "Ethereum Sepolia",
    id: "6wQRC7geo9XYAhckfmfo8kbMRLeWU8KQd3XsJqFKmZLT",
  },
};
export const agentFields = `id chainId agentId owner agentWallet totalFeedback
  registrationFile { name description active mcpEndpoint a2aEndpoint mcpTools a2aSkills }
  feedback(first: 20, where: { isRevoked: false }, orderBy: createdAt, orderDirection: desc) {
    clientAddress value tag1 tag2
  }`;
export const discoveryQuery = `query MaqamAgents {
  _meta { block { number timestamp } hasIndexingErrors }
  agents(first: 50, orderBy: updatedAt, orderDirection: desc) { ${agentFields} }
}`;
const clean = (v, n = 500) => (typeof v === "string" ? v.slice(0, n) : "");
const address = (v) =>
  isAddress(v || "") && getAddress(v) !== ZeroAddress ? getAddress(v) : null;

export function screenAgent(agent, task = "", minimumReviewers = 0) {
  const r = agent.registrationFile || {};
  const wallet = address(agent.agentWallet);
  const owner = address(agent.owner);
  const capabilities = [...(r.mcpTools || []), ...(r.a2aSkills || [])]
    .slice(0, 40)
    .map((v) => clean(v, 100));
  const text =
    `${clean(r.name)} ${clean(r.description, 2000)} ${capabilities.join(" ")}`.toLowerCase();
  const words = [
    ...new Set(task.toLowerCase().match(/[a-z0-9]{3,}/g) || []),
  ].slice(0, 12);
  const matches = words.filter((word) => text.includes(word));
  const reviewers = new Set(
    (agent.feedback || [])
      .filter(
        (f) => address(f.clientAddress) && address(f.clientAddress) !== owner,
      )
      .map((f) => f.clientAddress.toLowerCase()),
  ).size;
  const reasons = [];
  if (r.active !== true)
    reasons.push(
      "Registration is missing or does not declare this agent active.",
    );
  if (!wallet)
    reasons.push(
      "No nonzero agent wallet is indexed; owner is never substituted as payee.",
    );
  if (words.length && !matches.length)
    reasons.push("No declared capability or description matches this request.");
  if (reviewers < minimumReviewers)
    reasons.push(
      `Only ${reviewers} distinct non-owner reviewers in the latest 20 non-revoked entries; ${minimumReviewers} required.`,
    );
  return {
    id: clean(agent.id, 80),
    chainId: Number(agent.chainId),
    name: clean(r.name, 100) || `Agent ${clean(agent.agentId, 30)}`,
    description: clean(r.description),
    wallet,
    owner,
    capabilities,
    matchedTerms: matches,
    reviewers,
    eligible: reasons.length === 0,
    decision: reasons.length ? "HOLD" : "REVIEW",
    reasons: reasons.length
      ? reasons
      : [
          "Active registration, indexed wallet, and requested screening conditions met. Human review is still required.",
        ],
    warnings: [
      "Registration and capabilities are self-declared. Feedback is not Sybil-resistant or proof of service quality.",
      "Registry identity on this testnet does not establish an Arc service, invoice, or payment agreement.",
    ],
  };
}

export async function discoverAgents(
  input,
  { apiKey, fetcher = fetch, now = Date.now } = {},
) {
  const network = Number(input?.network || 84532);
  const source = graphSources[network];
  if (!source)
    throw new Error("Select Base Sepolia or Ethereum Sepolia for discovery.");
  if (typeof input.task !== "string" || input.task.length > 200)
    throw new Error("Describe the task in at most 200 characters.");
  const minimumReviewers = Number(input.minimumReviewers ?? 0);
  if (
    !Number.isInteger(minimumReviewers) ||
    minimumReviewers < 0 ||
    minimumReviewers > 20
  )
    throw new Error("Minimum reviewers must be 0 to 20.");
  if (!apiKey)
    throw new Error(
      "The Graph API key is not configured. Live discovery is unavailable; no cached results will be substituted.",
    );
  const response = await fetcher(
    `https://gateway.thegraph.com/api/subgraphs/id/${source.id}`,
    {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query: discoveryQuery }),
    },
  );
  if (!response.ok)
    throw new Error(`The Graph gateway returned HTTP ${response.status}.`);
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000) {
        await reader.cancel();
        throw new Error("Graph response exceeded the 2 MB limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const raw = JSON.parse(new TextDecoder().decode(bytes));
  if (raw.errors?.length || !Array.isArray(raw.data?.agents))
    throw new Error(
      "The Graph query failed. No discovery decision was produced.",
    );
  const meta = raw.data._meta;
  const timestamp = Number(meta?.block?.timestamp);
  if (
    meta?.hasIndexingErrors ||
    !Number.isSafeInteger(timestamp) ||
    timestamp > now() / 1000 + 60 ||
    now() / 1000 - timestamp > 900
  )
    throw new Error(
      "The Graph index is unhealthy or more than 15 minutes behind. Discovery is paused.",
    );
  if (raw.data.agents.some((a) => Number(a.chainId) !== network))
    throw new Error("Graph result contained an unexpected registry network.");
  const retrievedAt = new Date(now()).toISOString();
  const snapshot = {
    network,
    subgraphId: source.id,
    indexedBlock: meta.block.number,
    indexedTimestamp: timestamp,
    retrievedAt,
    task: input.task,
    minimumReviewers,
    agents: raw.data.agents,
  };
  const snapshotHash = keccak256(toUtf8Bytes(JSON.stringify(snapshot)));
  const candidates = raw.data.agents
    .map((a) => screenAgent(a, input.task, minimumReviewers))
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        b.matchedTerms.length - a.matchedTerms.length ||
        b.reviewers - a.reviewers ||
        a.id.localeCompare(b.id),
    );
  return {
    source: "The Graph / Agent0 ERC-8004 Subgraph",
    network,
    networkName: source.name,
    subgraphId: source.id,
    retrievedAt,
    indexedBlock: meta.block.number,
    indexedTimestamp: timestamp,
    snapshotHash,
    task: input.task,
    minimumReviewers,
    scope:
      "Latest 50 updated registrations; feedback sample limited to 20 per agent. Screening, not a trust guarantee.",
    candidates,
    snapshot,
  };
}
