import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";

const port = process.env.PORT || 5000;

connectDatabase()
  .then(() => {
    const server = app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use. The backend may already be running.`);
        console.error(`Open http://localhost:${port}/api/health to check the active server, or stop the old process before starting a new one.`);
        process.exit(1);
      }

      console.error("Server failed to start", error.message);
      process.exit(1);
    });
  })
  .catch((error) => {
    console.error("Failed to connect database", error.message);
    process.exit(1);
  });
