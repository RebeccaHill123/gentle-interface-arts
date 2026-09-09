// Durable storage of the student's SQE1 assessment choice on their profile.
//
// The plan itself carries `input.sqeAssessment`, but the profile is the
// permanent record: it survives a re-plan, and it is what tells us whether a
// legacy SQE1 user has ever answered the question (never assume "both").
import { supabase } from "@/integrations/supabase/client";
import { isSqeAssessment, type SqeAssessment } from "@/lib/exam-scope";

export interface ExamPreference {
  /** null when the signed-in user has never chosen. */
  assessment: SqeAssessment | null;
  /** false when there is no signed-in user (anonymous onboarding). */
  authenticated: boolean;
}

export async function loadExamPreference(): Promise<ExamPreference> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { assessment: null, authenticated: false };
  const { data, error } = await supabase
    .from("profiles")
    .select("sqe_assessment")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) {
    console.warn("loadExamPreference failed", error);
    return { assessment: null, authenticated: true };
  }
  const value = (data as { sqe_assessment?: string | null } | null)?.sqe_assessment;
  return { assessment: isSqeAssessment(value) ? value : null, authenticated: true };
}

/**
 * Persist the choice. Returns false when nothing durable happened, so callers
 * never claim success on a failed write.
 */
export async function saveExamPreference(assessment: SqeAssessment): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return false;
  const { data, error } = await supabase
    .from("profiles")
    .update({ sqe_assessment: assessment } as never)
    .eq("user_id", uid)
    .select("user_id");
  if (error || !data || data.length === 0) {
    console.warn("saveExamPreference failed", error);
    return false;
  }
  return true;
}
