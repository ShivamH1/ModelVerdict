// Extremely simplified output guardrail
const OUTPUT_VIOLATION_PATTERNS = [
  /here is how you make a bomb/i,
  /I am a highly opinionated/i
];

export function checkOutputGuardrail(response: string): { triggered: boolean; reason?: string } {
  for (const pattern of OUTPUT_VIOLATION_PATTERNS) {
    if (pattern.test(response)) {
      return {
        triggered: true,
        reason: `Output contained restricted content: ${pattern.toString()}`
      };
    }
  }
  return { triggered: false };
}
