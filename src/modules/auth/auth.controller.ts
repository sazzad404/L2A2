import type { Request, Response } from "express";
import { authServiece } from "./auth.service";

const loginUser = async (req: Request, res: Response) => {
  try {
    const result = await authServiece.loginUserIntoDB(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
    });
  }
};



const signupUser = async (req: Request, res: Response) => {
  // console.log(req.body)
  try {
    // const result = await userService.createUserIntoBD(req.body);
    const result = await authServiece.signupUserFromDB(req.body)

   

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
      error: error,
      //   data: result.rows[0],
    });
  }
};

export const authController = {
  loginUser,
  signupUser
};
