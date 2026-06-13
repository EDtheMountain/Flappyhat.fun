import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, usersTable, scoresTable } from "@workspace/db";
import { SubmitScoreBody, GetLeaderboardQueryParams, GetUserProfileParams } from "@workspace/api-zod";

const router: IRouter = Router();

function calcBthCoins(score: number): number {
  return Math.floor(score / 300);
}

// POST /scores
router.post("/scores", async (req, res): Promise<void> => {
  const userId = (req.session as { userId?: number }).userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const parsed = SubmitScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { score } = parsed.data;
  const bthCoinsEarned = calcBthCoins(score);

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });

  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const isHighScore = score > user.highScore;

  // Insert score record
  await db.insert(scoresTable).values({
    userId,
    score,
    bthCoinsEarned,
  });

  // Update user stats
  await db
    .update(usersTable)
    .set({
      highScore: isHighScore ? score : user.highScore,
      bthCoins: user.bthCoins + bthCoinsEarned,
      gamesPlayed: user.gamesPlayed + 1,
    })
    .where(eq(usersTable.id, userId));

  // Get user's rank
  const rankResult = await db
    .select({ count: sql<string>`count(*)` })
    .from(usersTable)
    .where(sql`${usersTable.highScore} > ${isHighScore ? score : user.highScore}`);

  const rank = parseInt(rankResult[0]?.count ?? "0", 10) + 1;
  const totalBthCoins = user.bthCoins + bthCoinsEarned;

  res.status(201).json({
    score,
    bthCoinsEarned,
    totalBthCoins,
    isHighScore,
    rank,
  });
});

// GET /leaderboard
router.get("/leaderboard", async (req, res): Promise<void> => {
  const params = GetLeaderboardQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 50) : 50;

  const entries = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
      highScore: usersTable.highScore,
      bthCoins: usersTable.bthCoins,
      isGuest: usersTable.isGuest,
    })
    .from(usersTable)
    .where(sql`${usersTable.highScore} > 0`)
    .orderBy(desc(usersTable.highScore))
    .limit(limit);

  const result = entries.map((e, i) => ({
    rank: i + 1,
    userId: e.id,
    username: e.username,
    displayName: e.displayName,
    avatarUrl: e.avatarUrl ?? null,
    highScore: e.highScore,
    bthCoins: e.bthCoins,
    isGuest: e.isGuest,
  }));

  res.json(result);
});

// GET /users/:userId
router.get("/users/:userId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const params = GetUserProfileParams.safeParse({ userId: rawId });
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, params.data.userId),
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const rankResult = await db
    .select({ count: sql<string>`count(*)` })
    .from(usersTable)
    .where(sql`${usersTable.highScore} > ${user.highScore} AND ${usersTable.highScore} > 0`);

  const rank = user.highScore > 0 ? parseInt(rankResult[0]?.count ?? "0", 10) + 1 : null;

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    bthCoins: user.bthCoins,
    highScore: user.highScore,
    isGuest: user.isGuest,
    gamesPlayed: user.gamesPlayed,
    rank,
  });
});

export default router;
