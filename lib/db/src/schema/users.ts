import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  twitterId: text("twitter_id").unique(),
  twitterAccessToken: text("twitter_access_token"),
  twitterAccessSecret: text("twitter_access_secret"),
  isGuest: boolean("is_guest").notNull().default(false),
  bthCoins: integer("bth_coins").notNull().default(0),
  highScore: integer("high_score").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
