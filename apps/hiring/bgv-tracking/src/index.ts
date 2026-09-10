import "dotenv/config";
import { createApp } from "./app";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4002;
const app = createApp();

app.listen(port, () => {
  console.log(`bgv-tracking listening on :${port}`);
});
