import test from "node:test";
import assert from "node:assert/strict";
import { decideFollowUp } from "./matter-intake.ts";

test("an audio transcript mentioning a deadline becomes a follow-up", () => {
  assert.equal(decideFollowUp("Please file the response before the deadline"), "follow-up");
  assert.equal(decideFollowUp("No further work is needed"), "archive");
});
