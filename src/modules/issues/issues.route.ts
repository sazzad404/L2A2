import { Router } from "express";
import { issueController } from "./issues.controller";

const router = Router()


router.post("/", issueController.createIssue)
router.get("/", issueController.getAllIssue )
router.get("/:id", issueController.getSingleIssue)



export const issuesRouter = router