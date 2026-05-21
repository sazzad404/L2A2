import type { Request, Response } from "express";
import { issueService } from "./issues.service";

const createIssue = async(req:  Request, res: Response)=>{

    try {
        const result = await issueService.issueCreateIntoDB(req.body)

        res.status(201).json({
            success: true,
            message: "Issue created successfully",
            data: result.rows[0]
        })
    } catch (error: any) {
        res.status(500).json({
      message: error.message,
      error: error,
      //   data: result.rows[0],
    });
    }
}

export const  issueController = {
createIssue
}