import app from "./app";
import { ENV } from "./config/keys";
import logger from "./config/logger";
import colors from "colors";
import { createServer, Server } from "http";

const { PORT, HOST, NODE_ENV } = ENV;
const server: Server = createServer(app);

server.listen(PORT, () => {
  logger.info(colors.green(`Server running on http://${HOST}:${PORT} in ${NODE_ENV} mode`));
});
