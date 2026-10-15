"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { ME_QUERY_KEY } from "@/hooks/use-me";
import { getMyProfile } from "@/modules/profile/api/profile";
import type { Me, MyProfile } from "@/types";

export const MY_PROFILE_KEY = ["myProfile"] as const;

export function useOwnProfile(username: string): MyProfile | undefined {
  const { me } = useAuth();
  const { data } = useQuery<MyProfile>({ queryKey: MY_PROFILE_KEY, queryFn: getMyProfile, enabled: false });
  return me?.username === username && data?.username === username ? data : undefined;
}

export function usePublishOwnProfile() {
  const queryClient = useQueryClient();
  return useCallback(
    (profile: MyProfile) => {
      queryClient.setQueryData(MY_PROFILE_KEY, profile);
      queryClient.setQueryData<Me>(ME_QUERY_KEY, (me) =>
        me ? { ...me, avatarUrl: profile.avatarUrl, displayName: profile.displayName ?? null } : me,
      );
    },
    [queryClient],
  );
}
