import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getStudyPlan from "./tools/get-study-plan";
import getRecentStudySessions from "./tools/get-recent-study-sessions";
import getSubjectProgress from "./tools/get-subject-progress";
import getWeakAreas from "./tools/get-weak-areas";
import getNextRecommendedSession from "./tools/get-next-recommended-session";
import askAiCoach from "./tools/ask-ai-coach";
import askAiTutor from "./tools/ask-ai-tutor";
import generateMiniTest from "./tools/generate-mini-test";
import listMockSimulations from "./tools/list-mock-simulations";
import logStudySession from "./tools/log-study-session";
import updateStudyPlan from "./tools/update-study-plan";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tentra-mcp",
  title: "Tentra",
  version: "0.2.0",
  instructions:
    "Tools for the Tentra SQE / NY Bar study app. Reads the signed-in user's profile, study plan, recent sessions, subject progress, weak areas and mock history; recommends a next session; asks the in-app AI Coach (planning/accountability) or AI Tutor (subject explanation & testing) using the user's real data; generates mini tests; and — with explicit user confirmation — logs study sessions or updates a limited set of plan fields. All tools are scoped to the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getProfile,
    getStudyPlan,
    getRecentStudySessions,
    getSubjectProgress,
    getWeakAreas,
    getNextRecommendedSession,
    askAiCoach,
    askAiTutor,
    generateMiniTest,
    listMockSimulations,
    logStudySession,
    updateStudyPlan,
  ],
});
