import config from "../../config/env";
import { pool } from "../../DB";
import type { User } from "../users/user.interface";
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
    role: user.role
  };

  const Token = jwt.sign(jwtPayload, config.secret as string, {
    expiresIn: "7d",
  });

  

  delete user.password
  return {
    Token,
    user,
  };
};



const signupUserFromDB = async (payload: User) => {
  const { name, email, password, role } = payload;

  // console.log(password)
  const hashPassword = await bcrypt.hash(password,10 )
  // console.log(hashPassword)

  const finalRole = role ?? "contributor";
  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, role) VALUES($1,$2,$3, $4) RETURNING name, email, role,created_at,updated_at 
    `,
    [name, email, hashPassword, finalRole],
  );

  return result;
};

export const authServiece = {
  loginUserIntoDB,
  signupUserFromDB
};
