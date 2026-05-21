import { pool } from "../../DB";
import type { Issue } from "./issue.interface";

const issueCreateIntoDB = async (payload: Issue) => {
  const { title, description, type, status, reporter_id } = payload;

  const user = await pool.query(
    `
    SELECT * FROM users WHERE id=$1
    
    `,
    [reporter_id],
  );

  if (user.rows.length === 0) {
    throw new Error("User not found");
  }

  const finalStatus = status ?? "open";
 
  const result = await pool.query(
    `
        INSERT INTO issues (title,description, type, status, reporter_id ) VALUES($1,$2,$3, $4, $5) RETURNING *
        
        `,
    [title, description, type, finalStatus, reporter_id],
  );

  return result;
};

export const issueService = {
  issueCreateIntoDB,
};
