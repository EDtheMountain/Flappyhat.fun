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
      country: usersTable.country,
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
    country: e.country ?? null,
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

// GET /leaderboard/country
// Returns per-country aggregated stats: total players, total score, average score,
// top score, and top player. Countries are ranked by average score.
const COUNTRY_NAMES: Record<string, string> = {
  "AF": "Afghanistan", "AL": "Albania", "DZ": "Algeria", "AD": "Andorra", "AO": "Angola",
  "AG": "Antigua and Barbuda", "AR": "Argentina", "AM": "Armenia", "AU": "Australia",
  "AT": "Austria", "AZ": "Azerbaijan", "BS": "Bahamas", "BH": "Bahrain", "BD": "Bangladesh",
  "BB": "Barbados", "BY": "Belarus", "BE": "Belgium", "BZ": "Belize", "BJ": "Benin",
  "BT": "Bhutan", "BO": "Bolivia", "BA": "Bosnia and Herzegovina", "BW": "Botswana",
  "BR": "Brazil", "BN": "Brunei", "BG": "Bulgaria", "BF": "Burkina Faso", "BI": "Burundi",
  "KH": "Cambodia", "CM": "Cameroon", "CA": "Canada", "CV": "Cape Verde", "CF": "Central African Republic",
  "TD": "Chad", "CL": "Chile", "CN": "China", "CO": "Colombia", "KM": "Comoros", "CG": "Congo",
  "CR": "Costa Rica", "HR": "Croatia", "CU": "Cuba", "CY": "Cyprus", "CZ": "Czech Republic",
  "DK": "Denmark", "DJ": "Djibouti", "DM": "Dominica", "DO": "Dominican Republic", "EC": "Ecuador",
  "EG": "Egypt", "SV": "El Salvador", "GQ": "Equatorial Guinea", "ER": "Eritrea", "EE": "Estonia",
  "ET": "Ethiopia", "FJ": "Fiji", "FI": "Finland", "FR": "France", "GA": "Gabon", "GM": "Gambia",
  "GE": "Georgia", "DE": "Germany", "GH": "Ghana", "GR": "Greece", "GT": "Guatemala", "GN": "Guinea",
  "GW": "Guinea-Bissau", "GY": "Guyana", "HT": "Haiti", "HN": "Honduras", "HU": "Hungary",
  "IS": "Iceland", "IN": "India", "ID": "Indonesia", "IR": "Iran", "IQ": "Iraq", "IE": "Ireland",
  "IL": "Israel", "IT": "Italy", "JM": "Jamaica", "JP": "Japan", "JO": "Jordan", "KZ": "Kazakhstan",
  "KE": "Kenya", "KI": "Kiribati", "KP": "North Korea", "KR": "South Korea", "KW": "Kuwait",
  "KG": "Kyrgyzstan", "LA": "Laos", "LV": "Latvia", "LB": "Lebanon", "LS": "Lesotho", "LR": "Liberia",
  "LY": "Libya", "LI": "Liechtenstein", "LT": "Lithuania", "LU": "Luxembourg", "MG": "Madagascar",
  "MW": "Malawi", "MY": "Malaysia", "MV": "Maldives", "ML": "Mali", "MT": "Malta", "MH": "Marshall Islands",
  "MR": "Mauritania", "MU": "Mauritius", "MX": "Mexico", "FM": "Micronesia", "MD": "Moldova",
  "MC": "Monaco", "MN": "Mongolia", "ME": "Montenegro", "MA": "Morocco", "MZ": "Mozambique",
  "MM": "Myanmar", "NA": "Namibia", "NR": "Nauru", "NP": "Nepal", "NL": "Netherlands", "NZ": "New Zealand",
  "NI": "Nicaragua", "NE": "Niger", "NG": "Nigeria", "MK": "North Macedonia", "NO": "Norway",
  "OM": "Oman", "PK": "Pakistan", "PW": "Palau", "PA": "Panama", "PG": "Papua New Guinea",
  "PY": "Paraguay", "PE": "Peru", "PH": "Philippines", "PL": "Poland", "PT": "Portugal",
  "QA": "Qatar", "RO": "Romania", "RU": "Russia", "RW": "Rwanda", "SA": "Saudi Arabia",
  "SN": "Senegal", "RS": "Serbia", "SG": "Singapore", "SK": "Slovakia", "SI": "Slovenia",
  "SB": "Solomon Islands", "SO": "Somalia", "ZA": "South Africa", "ES": "Spain", "LK": "Sri Lanka",
  "SD": "Sudan", "SR": "Suriname", "SE": "Sweden", "CH": "Switzerland", "SY": "Syria", "TW": "Taiwan",
  "TJ": "Tajikistan", "TZ": "Tanzania", "TH": "Thailand", "TL": "Timor-Leste", "TG": "Togo",
  "TO": "Tonga", "TT": "Trinidad and Tobago", "TN": "Tunisia", "TR": "Turkey", "TM": "Turkmenistan",
  "TV": "Tuvalu", "UG": "Uganda", "UA": "Ukraine", "AE": "United Arab Emirates", "GB": "United Kingdom",
  "US": "United States", "UY": "Uruguay", "UZ": "Uzbekistan", "VU": "Vanuatu", "VE": "Venezuela",
  "VN": "Vietnam", "YE": "Yemen", "ZM": "Zambia", "ZW": "Zimbabwe"
};

function countryFlag(code: string): string {
  return code.toUpperCase().split("").map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join("");
}

router.get("/leaderboard/country", async (_req, res): Promise<void> => {
  // Aggregate every score ever submitted (not just high scores) by country.
  const rows = await db
    .select({
      country: usersTable.country,
      totalScores: sql<number>`count(${scoresTable.id})`,
      totalScore: sql<number>`sum(${scoresTable.score})`,
      totalPlayers: sql<number>`count(distinct ${scoresTable.userId})`,
      topScore: sql<number>`max(${scoresTable.score})`,
      topPlayer: sql<string>`(select display_name from users where users.country = ${usersTable.country} order by high_score desc limit 1)`,
    })
    .from(scoresTable)
    .innerJoin(usersTable, eq(scoresTable.userId, usersTable.id))
    .where(sql`${usersTable.country} is not null`)
    .groupBy(usersTable.country);

  const entries = rows
    .map((r) => {
      const code = r.country!;
      const totalScores = Number(r.totalScores);
      const totalScore = Number(r.totalScore);
      const totalPlayers = Number(r.totalPlayers);
      const topScore = Number(r.topScore);
      return {
        country: code,
        countryName: COUNTRY_NAMES[code] ?? code,
        flag: countryFlag(code),
        totalPlayers,
        totalScores,
        totalScore,
        averageScore: totalScores > 0 ? Math.round(totalScore / totalScores) : 0,
        topScore,
        topPlayer: r.topPlayer ?? "Unknown",
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((e, i) => ({ ...e, rank: i + 1 }));

  res.json(entries);
});

export default router;
