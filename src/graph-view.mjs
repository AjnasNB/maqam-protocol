let selection;
let queryRevision = 0;
const el = (id) => document.getElementById(id);
const node = (tag, text, className) => {
  const n = document.createElement(tag);
  n.textContent = text;
  if (className) n.className = className;
  return n;
};
export function clearGraphSelection() {
  selection = undefined;
  el("graph-selected").textContent =
    "No agent selected. Manual payments remain available below.";
}
export async function refreshGraphSelection(recipient) {
  if (!selection) return null;
  const selected = selection;
  if (selection.wallet.toLowerCase() !== recipient.toLowerCase())
    throw new Error(
      "Recipient differs from the selected Graph agent. Clear the agent selection for a manual payment.",
    );
  const data = await query(selection.input);
  if (selection !== selected)
    throw new Error("Graph selection changed. Review the payment again.");
  const candidate = data.candidates.find((a) => a.id === selected.id);
  if (
    !candidate?.eligible ||
    candidate.wallet.toLowerCase() !== recipient.toLowerCase()
  )
    throw new Error(
      "Live Graph screening changed. Discover and select the agent again.",
    );
  return {
    agentId: candidate.id,
    wallet: candidate.wallet,
    snapshotHash: data.snapshotHash,
    snapshot: data.snapshot,
  };
}
async function query(input) {
  const r = await fetch("/api/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Live Graph discovery failed.");
  return data;
}
export function initGraphView(onSelect) {
  for (const id of ["graph-task", "graph-network", "graph-reviewers"]) {
    el(id).addEventListener("input", () => {
      queryRevision++;
      clearGraphSelection();
      onSelect(null);
      el("graph-results").replaceChildren();
      el("graph-status").textContent =
        "Screening conditions changed. Discover agents again.";
      el("graph-search").disabled = false;
    });
  }
  el("graph-model").onclick = async () => {
    const target = el("graph-model-result");
    target.hidden = false;
    target.replaceChildren(node("p", "Loading recorded model reasoning…"));
    try {
      const r = await fetch("/evidence/graph-agent-analysis.json");
      if (!r.ok)
        throw new Error("Recorded Graph model analysis is unavailable.");
      const data = await r.json();
      target.replaceChildren();
      target.append(
        node("p", "RECORDED MODEL ANALYSIS · LIVE GRAPH SNAPSHOT", "eyebrow"),
        node("h3", `Recommendation: ${data.output.agentId || "No candidate"}`),
        node("p", data.output.explanation),
        node(
          "p",
          Array.isArray(data.output.limitations)
            ? data.output.limitations.join(" ")
            : data.output.limitations,
        ),
      );
      target.append(
        node(
          "p",
          `Model: ${data.model} · Graph block: ${data.graph.indexedBlock} · Recorded: ${data.generatedAt}. This model call is not running now; use Discover & screen for fresh Graph data.`,
        ),
      );
      const details = node("details", "");
      details.append(
        node(
          "summary",
          "Inspect preserved prompt, response and Graph evidence",
        ),
        node("pre", JSON.stringify(data, null, 2)),
      );
      target.append(details);
    } catch (error) {
      target.replaceChildren(node("p", error.message));
    }
  };
  el("graph-clear").onclick = () => {
    clearGraphSelection();
    onSelect(null);
  };
  el("graph-form").onsubmit = async (e) => {
    e.preventDefault();
    const requestRevision = ++queryRevision;
    const button = el("graph-search"),
      results = el("graph-results"),
      status = el("graph-status");
    button.disabled = true;
    results.replaceChildren();
    clearGraphSelection();
    onSelect(null);
    status.textContent = "Querying The Graph and screening live registrations…";
    const input = {
      network: Number(el("graph-network").value),
      task: el("graph-task").value.trim(),
      minimumReviewers: Number(el("graph-reviewers").value),
    };
    try {
      const data = await query(input);
      if (requestRevision !== queryRevision) return;
      const eligible = data.candidates.filter((a) => a.eligible).length;
      status.textContent = `LIVE DATA · ${data.networkName} · indexed block ${data.indexedBlock} · ${eligible} of ${data.candidates.length} candidates meet screening conditions. Updated ${new Date(data.retrievedAt).toLocaleTimeString()}.`;
      if (!data.candidates.length)
        results.append(
          node(
            "p",
            "No registrations returned. Try again when the registry has updated.",
          ),
        );
      results.append(
        node(
          "p",
          "Showing the four highest-ranked candidates from this 50-registration sample. Full results are in the evidence below.",
          "graph-scope",
        ),
      );
      for (const candidate of data.candidates.slice(0, 4)) {
        const card = node("article", "", "graph-card");
        card.append(
          node("p", `${candidate.decision} · ${candidate.id}`, "eyebrow"),
          node("h3", candidate.name),
          node("p", candidate.description || "No description supplied."),
          node("p", candidate.reasons.join(" "), "graph-reason"),
        );
        card.append(
          node(
            "p",
            `Matched terms: ${candidate.matchedTerms.join(", ") || "none"} · Distinct non-owner reviewers: ${candidate.reviewers}`,
            "small-muted",
          ),
        );
        if (candidate.wallet) card.append(node("code", candidate.wallet));
        if (candidate.eligible) {
          const consent = node("label", "", "graph-consent"),
            checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          consent.append(
            checkbox,
            document.createTextNode(
              "I independently confirmed this address and the Arc testnet invoice. Registry discovery alone does not confirm either.",
            ),
          );
          const use = node("button", "Use wallet for reviewed payment");
          use.type = "button";
          use.disabled = true;
          checkbox.onchange = () => {
            use.disabled = !checkbox.checked;
          };
          use.onclick = () => {
            selection = { id: candidate.id, wallet: candidate.wallet, input };
            onSelect(candidate);
            el("graph-selected").textContent =
              `Selected ${candidate.name} (${candidate.id}). Graph screening is refreshed during payment review and its evidence hash is bound into your signature.`;
            el("workspace").scrollIntoView({ behavior: "smooth" });
          };
          card.append(consent, use);
        }
        results.append(card);
      }
      const details = node("details", "");
      details.append(
        node("summary", "Inspect live query evidence and scope"),
        node("p", data.scope),
        node("pre", JSON.stringify(data, null, 2)),
      );
      results.append(details);
    } catch (error) {
      if (requestRevision === queryRevision) status.textContent = error.message;
    } finally {
      if (requestRevision === queryRevision) button.disabled = false;
    }
  };
}
