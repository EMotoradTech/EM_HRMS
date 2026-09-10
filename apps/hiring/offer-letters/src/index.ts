import "dotenv/config";
import { createApp } from "./app";
import { setDocumentEngineClient } from "./services/documentEngineClient";
import { HttpDocumentEngineClient } from "./services/httpDocumentEngineClient";

if (process.env.DOCUMENT_ENGINE_MODE === "http") {
  const baseUrl = process.env.DOCUMENT_ENGINE_BASE_URL;
  const token = process.env.DOCUMENT_ENGINE_TOKEN;
  if (!baseUrl || !token) {
    throw new Error("DOCUMENT_ENGINE_BASE_URL and DOCUMENT_ENGINE_TOKEN are required when DOCUMENT_ENGINE_MODE=http");
  }
  setDocumentEngineClient(new HttpDocumentEngineClient(baseUrl, token));
}
// else: keep the default MockDocumentEngineClient from documentEngineClient.ts

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4003;
const app = createApp();

app.listen(port, () => {
  console.log(`offer-letters listening on :${port} (document engine mode: ${process.env.DOCUMENT_ENGINE_MODE ?? "mock"})`);
});
