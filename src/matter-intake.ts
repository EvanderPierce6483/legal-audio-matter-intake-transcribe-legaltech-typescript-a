import { z } from "zod";
import { aiClient, ensureBucket, presign } from "./infrai-client.ts";

export const intakeRequest = z.object({
  matterId: z.string().min(1),
  audioKey: z.string().min(1),
  transcript: z.string().min(1),
  signedDocumentKey: z.string().min(1),
  deadline: z.string().datetime().optional(),
});
export type IntakeRequest = z.infer<typeof intakeRequest>;

export type IntakeResult = { matterId: string; action: "follow-up" | "archive"; audioUrl: string; signedDocumentUrl: string };

export function decideFollowUp(transcript: string, deadline?: string): "follow-up" | "archive" {
  const needsAction = /deadline|follow up|follow-up|file|sign/i.test(transcript);
  return needsAction || Boolean(deadline) ? "follow-up" : "archive";
}

export async function handleMatter(input: unknown): Promise<IntakeResult> {
  const body = intakeRequest.parse(input);
  const bucket = process.env.INFRAI_BUCKET ?? "legal-matter-audio";
  await ensureBucket(bucket);
  const audioUrl = (await presign(bucket, body.audioKey, "get")).url;
  const signedDocumentUrl = (await presign(bucket, body.signedDocumentKey, "get", "application/pdf")).url;
  const decision = decideFollowUp(body.transcript, body.deadline);
  await aiClient().chat.completions.create({
    model: "auto",
    messages: [{ role: "user", content: `Classify this legal matter note as ${decision}: ${body.transcript}` }],
  });
  return { matterId: body.matterId, action: decision, audioUrl, signedDocumentUrl };
}

if (import.meta.main) {
  const input = process.env.MATTER_INPUT ? JSON.parse(process.env.MATTER_INPUT) : {
    matterId: "matter-104",
    audioKey: "matter-104/intake.m4a",
    transcript: "Client asked us to file before the deadline and follow up after signature.",
    signedDocumentKey: "matter-104/engagement-signed.pdf",
    deadline: "2026-12-01T17:00:00.000Z",
  };
  handleMatter(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
