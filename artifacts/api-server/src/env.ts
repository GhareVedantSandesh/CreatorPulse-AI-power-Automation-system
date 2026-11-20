import * as dotenv from "dotenv";
import path from "path";
// Load root .env first
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
// Override with local .env if present
dotenv.config({ path: path.resolve(process.cwd(), ".env"), override: true });
