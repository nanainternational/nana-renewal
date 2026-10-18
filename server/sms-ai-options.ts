export const SMS_ANALYSIS_MODEL = "gpt-5";
export const SMS_GENERATION_MODEL = "gpt-5.4-mini";

export function smsAiOptions(task: "sms_template_analysis" | "sms_generated_body") {
  return task === "sms_template_analysis"
    ? { model: SMS_ANALYSIS_MODEL }
    : { model: SMS_GENERATION_MODEL, reasoning: { effort: "none" } };
}
