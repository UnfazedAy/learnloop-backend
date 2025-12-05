import app from "./app";
import { ENV } from "./config/keys";
import logger from "./config/logger";
import colors from "colors";
import { createServer } from "http";

const server = createServer(app);

// Cloud Run provides PORT dynamically
const PORT = Number(process.env.PORT || ENV.PORT || 3000);

// Host should always be 0.0.0.0 for containerized deployments
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  logger.info(
    colors.green(`🚀 Server running on http://${HOST}:${PORT} in ${process.env.NODE_ENV} mode`)
  );
});
