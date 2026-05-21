import { pool } from "../../DB";
import type { User } from "./user.interface";

const createUserIntoBD = async (payload: User)=>{

    const {name, email, password, role} = payload

    const finalRole = role ?? "contributor"
       const result = await pool.query(
      `
    INSERT INTO users(name, email, password, role) VALUES($1,$2,$3, $4) RETURNING name, email, role
    `,
      [name, email, password, finalRole],
    );

    return result
}

const getAllUserFromDB = async ()=>{
  const result = await pool.query(`
            SELECT * FROM users
            `);
            return result
}
const getSingleUserFromDB = async (id : string) => {
   const result = await pool.query(
      `
            SELECT * FROM users WHERE id=$1
            `,
      [id],
    );

    return result
  
}

export const userService ={
    createUserIntoBD,
    getAllUserFromDB,
    getSingleUserFromDB
}