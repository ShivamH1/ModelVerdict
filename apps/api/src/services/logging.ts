import { InferenceLog } from "@veritas/shared";
import { prisma } from "../db";
import { v4 as uuidv4 } from "uuid";

export async function logInference(
  logData: Omit<InferenceLog, "id" | "timestamp">,
) {
  const newLog = await prisma.inferenceLog.create({
    data: {
      ...logData,
      id: `log-${uuidv4()}`,
    },
  });

  return newLog as unknown as InferenceLog;
}
