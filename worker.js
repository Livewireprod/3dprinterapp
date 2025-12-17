export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors() });
    }

    const GAS_URL =
      "https://script.google.com/macros/s/AKfycbwdRHaAIBTC7q0olATYdoGb6BBZuO3OUrBaCvu6V2AJuZvpMsq1PFkvUUy9wMNscL-EMA/exec";

    const incoming = new URL(request.url);
    const target = new URL(GAS_URL);
    target.search = incoming.search; // forwards ?method=GET

    // Forward method + body + content-type (simple + reliable)
    const body = request.method === "GET" ? undefined : await request.text();

    const resp = await fetch(target.toString(), {
      method: request.method,
      headers: { "Content-Type": request.headers.get("Content-Type") || "text/plain" },
      body,
    });

    return new Response(await resp.text(), {
      status: resp.status,
      headers: {
        ...cors(),
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  },
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}
