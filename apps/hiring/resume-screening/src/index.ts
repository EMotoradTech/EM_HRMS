import "dotenv/config";
import { createApp } from "./app";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4001;
const app = createApp();

app.listen(port, () => {
  console.log(`resume-screening listening on :${port}`);
});
