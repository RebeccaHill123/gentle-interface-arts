import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import getStudyPlan from "./tools/get-study-plan";
import listMockSimulations from "./tools/list-mock-simulations";
import logStudySession from "./tools/log-study-session";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "tentra-mcp",
  title: "Tentra",
  version: "0.1.0",
  instructions:
    "Tools for the Tentra SQE / NY Bar study app. Read the signed-in user's profile, study plan, and mock exam history, and log study sessions on their behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, getStudyPlan, listMockSimulations, logStudySession],
});
