// Extremely simplified regex-based input guardrail for demonstration
const HARMFUL_PATTERNS = [
  /ignore all previous instructions/i,
  /you are now DAN/i,
  /how to (make|synthesize|build) (meth|bomb|explosive)/i,
  /developer mode/i,
];

export function checkInputGuardrail(prompt: string): {
  triggered: boolean;
  reason?: string;
} {
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        triggered: true,
        reason: `Input matched restricted pattern: ${pattern.toString()}`,
      };
    }
  }
  return { triggered: false };
}
