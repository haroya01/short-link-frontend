export type CampaignStatus = "DRAFT" | "ACTIVE" | "ENDED" | "ARCHIVED";
export type CampaignPostEndAction = "KEEP" | "EXPIRE" | "REDIRECT";

export type CampaignSummary = {
  id: number;
  name: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  batchCount: number;
};

export type CampaignDetail = {
  id: number;
  name: string;
  status: CampaignStatus;
  startsAt: string;
  endsAt: string;
  endedAt: string | null;
  defaultDestinationUrl: string | null;
  postEndAction: CampaignPostEndAction;
  postEndDestinationUrl: string | null;
  postEndMessage: string | null;
  batchCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CampaignCreatePayload = {
  name: string;
  startsAt?: string;
  endsAt: string;
  defaultDestinationUrl?: string;
  postEndAction?: CampaignPostEndAction;
  postEndDestinationUrl?: string;
  postEndMessage?: string;
};

export type CampaignUpdatePayload = Partial<{
  name: string;
  endsAt: string;
  defaultDestinationUrl: string;
  postEndAction: CampaignPostEndAction;
  postEndDestinationUrl: string;
  postEndMessage: string;
}>;

export type CampaignBatch = {
  id: number;
  campaignId: number;
  linkId: number;
  shortCode: string;
  shortUrl: string;
  destinationUrl: string;
  name: string;
  distributorName: string | null;
  areaLabel: string | null;
  quantity: number;
  memo: string | null;
  createdAt: string;
};

export type CampaignBatchCreatePayload = {
  name: string;
  distributorName?: string;
  areaLabel?: string;
  quantity: number;
  destinationUrl?: string;
  memo?: string;
};

export type CampaignBatchBulkPayload = { batches: CampaignBatchCreatePayload[] };
export type CampaignBatchUpdatePayload = Partial<CampaignBatchCreatePayload>;

export type CampaignStats = {
  totalClicks: number;
  testScans: number;
  lastTestScanAt: string | null;
  byBatch: {
    batchId: number;
    batchName: string;
    distributor: string | null;
    area: string | null;
    quantity: number;
    shortCode: string;
    clicks: number;
  }[];
  byDistributor: {
    key: string;
    clicks: number;
    totalQuantity: number;
    clickRatePerHundred: number;
  }[];
  byArea: {
    key: string;
    clicks: number;
    totalQuantity: number;
    clickRatePerHundred: number;
  }[];
  byHour: { hour: number; clicks: number }[];
  byDay: { day: string; clicks: number }[];
  heatmap: { dayOfWeek: number; hour: number; clicks: number }[];
};

export type CampaignStatsCompareResponse = {
  campaigns: {
    campaignId: number;
    name: string;
    stats: CampaignStats;
  }[];
};

export type CampaignRecommendation = {
  insufficient: boolean;
  insufficientReason: string | null;
  totalQuantity: number;
  totalClicks: number;
  avgRatePerHundred: number;
  recommendations: {
    batchId: number;
    batchName: string;
    distributor: string | null;
    area: string | null;
    currentQuantity: number;
    currentClicks: number;
    currentRatePerHundred: number;
    recommendedQuantity: number;
    delta: number;
    verdict: "BOOST" | "KEEP" | "REDUCE" | "PRUNE";
  }[];
};
