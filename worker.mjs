import proposalHandler from "./api/proposal.mjs";

// Adapt the same policy endpoint to Workers without forwarding to Vercel.
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/api/proposal")
      return env.ASSETS.fetch(request);
    const headers = new Headers({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    let code = 200;
    const res = {
      setHeader(name, value) {
        headers.set(name, value);
      },
      status(value) {
        code = value;
        return this;
      },
      json(value) {
        return Response.json(value, { status: code, headers });
      },
    };
    if (request.method !== "POST")
      return proposalHandler({ method: request.method, headers: {} }, res);
    const reader = request.body?.getReader();
    let body = "",
      size = 0;
    const decoder = new TextDecoder();
    try {
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 4096) {
            await reader.cancel();
            return res.status(413).json({ error: "Request too large" });
          }
          body += decoder.decode(value, { stream: true });
        }
      body += decoder.decode();
      return await proposalHandler({ method: "POST", headers: {}, body }, res);
    } catch {
      return res.status(400).json({ error: "Invalid proposal request" });
    } finally {
      reader?.releaseLock();
    }
  },
};
