import { pool } from "../../DB";
import type { User } from "./user.interface";
import bcrypt from "bcrypt";

const createUserIntoBD = async (payload: User) => {
  const { name, email, password, role } = payload;

  console.log(password)
  const hashPassword = await bcrypt.hash(password,10 )
  console.log(hashPassword)

  const finalRole = role ?? "contributor";
  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, role) VALUES($1,$2,$3, $4) RETURNING name, email, role
    `,
    [name, email, hashPassword, finalRole],
  );

  return result;
};

const getAllUserFromDB = async () => {
  const result = await pool.query(`
            SELECT id, name, email, role, created_at FROM users
            `);


  return result;
};
const getSingleUserFromDB = async (id: string) => {
  const result = await pool.query(
    `
            SELECT id, name, email, role, created_at FROM users WHERE id=$1 
            `,
    [id],
  );

  return result;
};

export const userService = {
  createUserIntoBD,
  getAllUserFromDB,
  getSingleUserFromDB,
};
