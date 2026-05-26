import { Session, EvalRun, InferenceLog } from '@veritas/shared';

export interface DatabaseSchema {
  sessions: Session[];
  evalRuns: EvalRun[];
  inferenceLogs: InferenceLog[];
}
