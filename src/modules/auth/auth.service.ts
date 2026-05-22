import config from "../../config/env";
import { pool } from "../../DB";
import type { Login } from "./auth.interface";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const loginUserIntoDB = async (payload: Login) => {
  const { email, password } = payload;

  //* check if the user exists
  const userData = await pool.query(
    `
    SELECT * FROM users WHERE email=$1
    
    `,
    [email],
  );

  if (userData.rows.length === 0) {
    throw new Error("Invalid credentials");
  }

  const user = userData.rows[0];

  const matchPassword = await bcrypt.compare(password, user.password);

  if (!matchPassword) {
    throw new Error("Invalid credentials");
  }

  //* Generate Token

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
  };

  const accessToken = jwt.sign(jwtPayload, config.secret as string, { expiresIn: "7d" });

  return accessToken;
};

export const authServiece = {
  loginUserIntoDB,
};
