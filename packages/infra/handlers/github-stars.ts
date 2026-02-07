/**
 * Lambda handler for GitHub stars proxy.
 * Avoids client-side rate limits (60/hour per IP) by fetching server-side.
 */
const GITHUB_API_URL = "https://api.github.com/repos/ekingunoncu/izan.io";

export async function handler() {
  try {
    const res = await fetch(GITHUB_API_URL);
    const data = (await res.json()) as { stargazers_count?: number };
    const stars =
      typeof data?.stargazers_count === "number" ? data.stargazers_count : 0;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
      body: JSON.stringify({ stars }),
    };
  } catch {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ stars: 0 }),
    };
  }
}
