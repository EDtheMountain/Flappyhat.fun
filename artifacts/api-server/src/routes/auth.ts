import { Router, type IRouter, type Request } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { GuestLoginBody, GuestLoginResponse, GetMeResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

/** Best-effort IP-based country detection. Returns ISO-3166-1 alpha-2 code or null. */
async function detectCountry(req: Request): Promise<string | null> {
  try {
    const forwarded = req.headers["x-forwarded-for"] as string | undefined;
    const ip = forwarded?.split(",")[0]?.trim() || req.socket?.remoteAddress;
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("10.") || ip.startsWith("192.168.")) return null;
    const resp = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=countryCode`, { signal: AbortSignal.timeout(2000) });
    if (!resp.ok) return null;
    const data = await resp.json() as { countryCode?: string };
    const code = data.countryCode;
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch {
    return null;
  }
}

const router: IRouter = Router();

// GET /auth/twitter - redirect to Twitter OAuth
router.get("/auth/twitter", async (req, res): Promise<void> => {
  const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0]
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : `http://localhost:${process.env.PORT || 5000}`;

  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    // Twitter not configured — return info for the frontend to show a message
    res.json({ url: null, error: "Twitter OAuth not configured. Please use guest login." });
    return;
  }

  // Twitter OAuth 1.0a request token
  const callbackUrl = `${baseUrl}/api/auth/twitter/callback`;
  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
  const oauthNonce = crypto.randomBytes(16).toString("hex");

  const params: Record<string, string> = {
    oauth_callback: callbackUrl,
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_version: "1.0",
  };

  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const baseString = `POST&${encodeURIComponent("https://api.twitter.com/oauth/request_token")}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  params["oauth_signature"] = signature;
  const authHeader =
    "OAuth " +
    Object.keys(params)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
      .join(", ");

  try {
    const resp = await fetch("https://api.twitter.com/oauth/request_token", {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    const text = await resp.text();
    const parsed = Object.fromEntries(new URLSearchParams(text));

    if (!parsed.oauth_token) {
      req.log.error({ text }, "Failed to get Twitter request token");
      res.status(500).json({ error: "Failed to initiate Twitter OAuth" });
      return;
    }

    const twitterAuthUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${parsed.oauth_token}`;
    res.json({ url: twitterAuthUrl });
  } catch (err) {
    req.log.error({ err }, "Twitter OAuth request failed");
    res.status(500).json({ error: "Twitter OAuth error" });
  }
});

// GET /auth/twitter/callback
router.get("/auth/twitter/callback", async (req, res): Promise<void> => {
  const oauthToken = req.query.oauth_token as string;
  const oauthVerifier = req.query.oauth_verifier as string;

  const consumerKey = process.env.TWITTER_CONSUMER_KEY;
  const consumerSecret = process.env.TWITTER_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret || !oauthToken || !oauthVerifier) {
    res.redirect("/?auth_error=1");
    return;
  }

  const oauthTimestamp = Math.floor(Date.now() / 1000).toString();
  const oauthNonce = crypto.randomBytes(16).toString("hex");

  const params: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauthNonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: oauthTimestamp,
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
    oauth_version: "1.0",
  };

  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join("&");

  const baseString = `POST&${encodeURIComponent("https://api.twitter.com/oauth/access_token")}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&`;
  const signature = crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");

  params["oauth_signature"] = signature;
  const authHeader =
    "OAuth " +
    Object.keys(params)
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
      .join(", ");

  try {
    const resp = await fetch("https://api.twitter.com/oauth/access_token", {
      method: "POST",
      headers: { Authorization: authHeader },
    });
    const text = await resp.text();
    const parsed = Object.fromEntries(new URLSearchParams(text));

    if (!parsed.oauth_token || !parsed.user_id) {
      res.redirect("/?auth_error=1");
      return;
    }

    const twitterId = parsed.user_id;
    const screenName = parsed.screen_name || `user_${twitterId}`;
    const accessToken = parsed.oauth_token;
    const accessSecret = parsed.oauth_token_secret;

    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.twitterId, twitterId),
    });

    const country = await detectCountry(req);

    if (!user) {
      const [newUser] = await db
        .insert(usersTable)
        .values({
          username: screenName,
          displayName: screenName,
          twitterId,
          twitterAccessToken: accessToken,
          twitterAccessSecret: accessSecret,
          isGuest: false,
          country,
        })
        .returning();
      user = newUser;
    } else {
      await db
        .update(usersTable)
        .set({
          twitterAccessToken: accessToken,
          twitterAccessSecret: accessSecret,
          ...(country && !user.country ? { country } : {}),
        })
        .where(eq(usersTable.id, user.id));
    }

    // Store userId in session
    (req.session as { userId?: number }).userId = user.id;
    res.redirect("/game");
  } catch (err) {
    req.log.error({ err }, "Twitter callback error");
    res.redirect("/?auth_error=1");
  }
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bthCoins: user.bthCoins,
      highScore: user.highScore,
      isGuest: user.isGuest,
      twitterId: user.twitterId,
    })
  );
});

// POST /auth/logout
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// POST /auth/guest
router.post("/auth/guest", async (req, res): Promise<void> => {
  const parsed = GuestLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username } = parsed.data;
  const sanitized = username.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);

  if (!sanitized) {
    res.status(400).json({ error: "Invalid username" });
    return;
  }

  // Make unique by appending random suffix if needed
  let finalUsername = sanitized;
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.username, sanitized),
  });
  const country = await detectCountry(req);

  if (existing && existing.isGuest) {
    // Reuse guest account, update country if not set
    if (country && !existing.country) {
      await db.update(usersTable).set({ country }).where(eq(usersTable.id, existing.id));
    }
    (req.session as { userId?: number }).userId = existing.id;
    res.json(GuestLoginResponse.parse({
      id: existing.id,
      username: existing.username,
      displayName: existing.displayName,
      avatarUrl: existing.avatarUrl,
      bthCoins: existing.bthCoins,
      highScore: existing.highScore,
      isGuest: true,
      twitterId: null,
    }));
    return;
  }

  if (existing) {
    finalUsername = `${sanitized}_${crypto.randomBytes(2).toString("hex")}`;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      username: finalUsername,
      displayName: username.trim().slice(0, 20),
      isGuest: true,
      country,
    })
    .returning();

  (req.session as { userId?: number }).userId = user.id;
  res.json(
    GuestLoginResponse.parse({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bthCoins: user.bthCoins,
      highScore: user.highScore,
      isGuest: true,
      twitterId: null,
    })
  );
  logger.info({ userId: user.id, username: user.username }, "Guest user created");
});

export default router;
