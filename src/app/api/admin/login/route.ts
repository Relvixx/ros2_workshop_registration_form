import { loginRoute, logoutRoute } from "../_helpers";

export async function POST(req: Request) {
  return loginRoute(req);
}

export async function DELETE() {
  // Always clear the cookie, even if the session already expired.
  return logoutRoute();
}
