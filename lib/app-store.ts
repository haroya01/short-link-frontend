export const IOS_APP_ID = { links: "6784306356", blog: "6780944983" } as const;

export type IosApp = keyof typeof IOS_APP_ID;

export function appStoreUrl(app: IosApp): string {
  return `https://apps.apple.com/app/id${IOS_APP_ID[app]}`;
}
