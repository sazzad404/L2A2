import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/env";
import { pool } from "../DB";
import type { ROLES } from "../types";
import type { CustomJwtPayload } from ".";

const auth = (...roles: ROLES[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // console.log(roles);
    try {
      // console.log(req.headers.authorization);

      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: " Unathorized Access",
        });
      }

      const decoded = jwt.verify(
        token as string,
        config.secret as string,
      ) as CustomJwtPayload;

      const userData = await pool.query(
        `
      SELECT * FROM users WHERE email=$1
      `,
        [decoded.email],
      );

      const user = userData.rows[0];

      if (userData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: " User not found",
        });
      }
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden!!",
        });
      }

      req.user = decoded;

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
