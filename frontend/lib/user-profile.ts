import type { ResumeView } from "@/app/play/hooks/types";

export interface UserProfile {
  name: string;
  targetRole: string;
  targetCity: string;
  preferredStrategy: "balanced" | "aggressive" | "conservative";
  resume: ResumeView | null;
}

export const USER_PROFILE_KEY = "bidding-game:user-profile";

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  targetRole: "",
  targetCity: "",
  preferredStrategy: "balanced",
  resume: null,
};

export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    return { ...EMPTY_PROFILE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile) {
  window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export function buildResumeFromProfile(input: {
  name: string;
  summary: string;
  skills: string;
  education: string;
  experience: string;
}): ResumeView {
  const skills = input.skills
    .split(/[，,\n]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

  return {
    resume_id: "local-profile-resume",
    name: input.name || "候选人",
    summary: input.summary,
    skills,
    education: input.education ? [{ school: input.education }] : [],
    experience: input.experience
      ? [{ company: "个人档案", title: input.summary || "候选人经历", description: input.experience }]
      : [],
  };
}
