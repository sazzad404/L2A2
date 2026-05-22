import type { Request } from "express";
import { authServiece } from "./auth.service";

const loginUser = async (req: Request, res: Response) => {

    try {
        const result = await authServiece.loginUserIntoDB(req.body)



        res.status(201).json({
      message: "Created successfully!!",
      data: result,
    });
    } catch (error : any) {
  res.status(500).json({
      success: false,
      message: error.message,
      error: error,
      
    });
        
    }



};

export const authController = {
  loginUser,
};
