export type FollowupType = "dormant" | "care_reminder";
export function canContact(consent: boolean, type: FollowupType, ongoing: boolean) { return type === "dormant" ? consent : ongoing; }
