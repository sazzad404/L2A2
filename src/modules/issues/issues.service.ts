import type { Request } from "express";

import type { Issue, IssueBody } from "./issue.interface";
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

  // 1. fetch issues first
  let query = `
    SELECT *
    FROM issues
  `;

  const conditions: string[] = [];

  if (type) {
    conditions.push(`type = '${type}'`);
  }

  if (status) {
    conditions.push(`status = '${status}'`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += sort === "oldest"
    ? ` ORDER BY created_at ASC`
    : ` ORDER BY created_at DESC`;

  const issuesResult = await pool.query(query);
  const issues = issuesResult.rows;

  if (issues.length === 0) return [];

  // 2. extract unique reporter ids
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];

  // 3. batch fetch users (NO JOIN)
  const usersResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = ANY($1)
    `,
    [reporterIds]
  );

  // 4. map users
  const userMap = new Map();
  usersResult.rows.forEach((u) => {
    userMap.set(u.id, u);
  });

  // 5. build final response structure
  const finalData = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,

    reporter: userMap.get(issue.reporter_id) || null,

    created_at: issue.created_at,
    updated_at: issue.updated_at,
  }));

  return finalData;
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
       

      json_build_object(
        'id', users.id,
        'name', users.name,
        'role', users.role
      ) AS reporter,


      issues.created_at,
      issues.updated_at

    FROM issues

    JOIN users
    ON issues.reporter_id = users.id

    WHERE issues.id = $1


   
    `,
    [id],
  );

  return result;
};

const updateIssueFromDB = async (
  id: string,
  body: IssueBody,
  user: { id: string; role: string },
) => {
  const { title, description, type } = body;

  //1. issue fetch
  const issueResult = await pool.query(
    `
     SELECT * FROM issues WHERE id=$1
    
    `,
    [id],
  );

  if (issueResult.rows.length === 0) {
    throw new Error("Issue Not Found");
  }

  const issue = issueResult.rows[0];

  //2.permission check
  if (user?.role === "contributor") {
    // is owner?
    if (issue.reporter_id !== user.id) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    //only Open issue
    if (issue.status !== "open") {
      throw new Error("FORBIDDEN_STATUS");
    }
  }

  // update
  const result = await pool.query(
    `
  UPDATE issues
  SET 
  title= COALESCE($1, title),
  description=COALESCE($2, description),
  type=COALESCE($3, type)
  WHERE id=$4 RETURNING *
  
  
  
  
  `,
    [title, description, type, id],
  );

  return result;
};

const deleteIssueFromDB = async (id: string) => {
  const result = await pool.query(
    `
    DELETE FROM issues WHERE id=$1
    
    `,
    [id],
  );

  return result;
};

export const issueService = {
  issueCreateIntoDB,
  getIssueFromDB,
  getSingleIssueFromDB,
  updateIssueFromDB,
  deleteIssueFromDB,
};
