import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import config from "./config/env";
import { initDB, pool } from "./DB";
import { userRoute } from "./modules/users/user.route";
import { issuesRouter } from "./modules/issues/issues.route";
import { authRoute } from "./modules/auth/auth.route";
const app: Application = express();

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    message: "Express Server",
    author: "Sazzad Hasan",
  });
});

app.use("/api/users", userRoute);

app.use("/api/issues", issuesRouter);

app.use("/api/auth", authRoute)

export default app;
