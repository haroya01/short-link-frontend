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
};
