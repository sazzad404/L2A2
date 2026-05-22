import type { Request } from "express";

import type { Issue } from "./issue.interface";
import { pool } from "../../DB";

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

const getIssueFromDB = async (req: Request) => {
  const { sort = "newest", type, status } = req.query;

  // let query = `SELECT * FROM issues`;
  let query = `
SELECT 
      issues.id,
      issues.title,
      issues.description,
      issues.type,
      issues.status,
      issues.created_at,
      issues.updated_at,

        json_build_object(
        'id', users.id,
        'name', users.name,
        'role', users.role
      ) AS reporter

      FROM issues
    JOIN users ON issues.reporter_id = users.id

`;

  const conditions: string[] = [];

  //filter
  if (type) {
    conditions.push(`type='${type}'`);
  }

  if (status) {
    conditions.push(`status='${status}'`);
  }

  //where

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  if (sort === "oldest") {
    query += `ORDER BY created_at ASC`;
  } else {
    query += `ORDER BY created_at DESC`;
  }

  const result = await pool.query(query);

  // const sortOrder = req.query.sort === "oldest" ? "ASC" : "DESC"
  // const queryText = `SELECT * FROM issues ORDER BY created_at ${sortOrder}`

  // const result = await pool.query(queryText)
  return result;
};

const getSingleIssueFromDB = async (id: string) => {
  const result = await pool.query(
    `
    SELECT
      issues.id,
      issues.title,
      issues.description,
      issues.type,
      issues.status,
       issues.created_at,
      issues.updated_at,

      json_build_object(
        'id', users.id,
        'name', users.name,
        'role', users.role
      ) AS reporter

    FROM issues

    JOIN users
    ON issues.reporter_id = users.id

    WHERE issues.id = $1


   
    `,
    [id],
  );

  return result;
};

export const issueService = {
  issueCreateIntoDB,
  getIssueFromDB,
  getSingleIssueFromDB,
};
