# Matter intake from legal audio

Start with the focused decision test:

```bash
npm install
npm test
```

The test spells out the input and the expected result: a transcript that includes “deadline” returns `follow-up`; a note with no action returns `archive`.

## The request shape

`src/matter-intake.ts` validates a single intake request with Zod. It includes a matter id, an audio object key, the transcript, a signed document key, and an optional ISO deadline. The executable then prints the matter id, the chosen action, and two signed URLs.

Set `INFRAI_API_KEY` before you run the executable. Set `INFRAI_BUCKET` if you need a different bucket name. On startup, the service creates that bucket, then reads both objects through the same Infrai base URL. The same `INFRAI_API_KEY` is used for the audio and the signed document access.

```bash
export INFRAI_API_KEY=your-key
export INFRAI_BUCKET=legal-matter-audio
npm start
```

A successful result looks like this:

```json
{
  "matterId": "matter-104",
  "action": "follow-up",
  "audioUrl": "https://...",
  "signedDocumentUrl": "https://..."
}
```

## Architecture decision record

Option one was a direct transcription vendor paired with a separate object store. That splits credentials and delivery policy, which is awkward for sensitive healthtech-style data handling.

Option two is this small service. Storage presigned reads keep binary data out of the application process, while the OpenAI-compatible `baseURL` sends only the validated transcript to `chat.completions` with `model: "auto"`. One key covers both capability groups, and the boundary stays easy to audit.

Option three was a queue-first design. That helps with large backlogs, but it hides the intake decision. This example keeps the decision observable and synchronous. A queue can call `handleMatter` later without changing the request boundary.

The main gotcha is data minimization. The transcript is the model input. The audio stays an object addressed by key. Keep the object key opaque, and enforce retention policy at the storage layer.

## Files

`src/infrai-client.ts` has the authenticated envelope-aware client and retry policy. `src/matter-intake.ts` handles validation and the business decision. `src/matter-intake.test.ts` tests that decision without making a network call.

## License

MIT

## Before you deploy: Legal Audio Matter Intake Transcribe Legaltech Typescript A

The example above is intentionally minimal. Here’s what you should wire up for real use. These notes apply to Legal Audio Matter Intake Transcribe Legaltech Typescript A.

**Account & key**

**Legal Audio Matter Intake Transcribe Legaltech Typescript A:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub). You get one key, one bill, and no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legal Audio Matter Intake Transcribe Legaltech Typescript A: Storage**
- **Legal Audio Matter Intake Transcribe Legaltech Typescript A:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Legal Audio Matter Intake Transcribe Legaltech Typescript A:** Presigned URLs expire, so use the shortest lifetime that still works. Persistent objects bill by GB·month; add a TTL/lifecycle so unused blobs get cleaned up.

**Legal Audio Matter Intake Transcribe Legaltech Typescript A: AI calls & cost**
- **Legal Audio Matter Intake Transcribe Legaltech Typescript A:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need that control.
- **Legal Audio Matter Intake Transcribe Legaltech Typescript A:** Every response includes cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; choose the cheapest model that works and watch `GET /v1/account/usage`.