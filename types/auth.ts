export type Me = {
  id: number;
  email: string;
  provider?: string;
  oauthProvider?: string;
  role: "USER" | "ADMIN";
  timezone?: string;
  createdAt: string;
  tier?: "FREE" | "PRO";
  subscriptionCurrentPeriodEnd?: string | null;
  username?: string | null;
  /** The viewer's avatar (header account control renders it, falling back to the initial). */
  avatarUrl?: string | null;
};
