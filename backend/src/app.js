import express from "express";
import { errorHandler } from "./middlewares/error-handler.js";
import routes from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use("/api", routes);
app.use((_request, response) => {
  response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy đường dẫn." } });
});
app.use(errorHandler);
