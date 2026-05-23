

   import { createRequire } from 'module';

   const require = createRequire(import.meta.url);

  

// src/app.ts
import express from "express";

// src/config/env.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  connection_string: process.env.CONNECTIONSTRING,
  port: process.env.PORT,
  secret: process.env.JWT_SECRET
};
var env_default = config;

// src/DB/index.ts
import { Pool } from "pg";
var pool = new Pool({
  connectionString: env_default.connection_string
});
var initDB = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role VARCHAR(255) DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()

            )
            `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues (
       id SERIAL PRIMARY KEY,
       title VARCHAR(150) NOT NULL,
       description TEXT NOT NULL CHECK (LENGTH(description) >=20),
       type VARCHAR(20) NOT NULL CHECK (type IN ('bug', 'feature_request')),
       status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress','resolved')),
       reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       created_at TIMESTAMP DEFAULT NOW(),
       updated_at TIMESTAMP DEFAULT NOW()
      )
      
      `);
    console.log("Database connected successfully");
  } catch (error) {
    console.log(error);
  }
};

// src/modules/users/user.route.ts
import { Router } from "express";

// src/modules/users/user.service.ts
import "bcrypt";
var getAllUserFromDB = async () => {
  const result = await pool.query(`
            SELECT id, name, email, role, created_at FROM users
            `);
  return result;
};
var getSingleUserFromDB = async (id) => {
  const result = await pool.query(
    `
            SELECT id, name, email, role, created_at FROM users WHERE id=$1 
            `,
    [id]
  );
  return result;
};
var userService = {
  getAllUserFromDB,
  getSingleUserFromDB
};

// src/modules/users/user.controller.ts
var getAllUser = async (req, res) => {
  try {
    const result = await userService.getAllUserFromDB();
    res.status(200).json({
      success: true,
      message: "Users retrived successfully",
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error
    });
  }
};
var getSingleUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await userService.getSingleUserFromDB(id);
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: {}
      });
    }
    res.status(200).json({
      success: true,
      message: "Users retrived successfully",
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
      error
    });
  }
};
var userController = {
  getAllUser,
  getSingleUser
};

// src/middleware/auth.ts
import jwt from "jsonwebtoken";
var auth = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          success: false,
          message: " Unathorized Access"
        });
      }
      const decoded = jwt.verify(
        token,
        env_default.secret
      );
      const userData = await pool.query(
        `
      SELECT * FROM users WHERE email=$1
      `,
        [decoded.email]
      );
      const user = userData.rows[0];
      if (userData.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: " User not found"
        });
      }
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden!!"
        });
      }
      req.user = decoded;
      next();
    } catch (error) {
      next(error);
    }
  };
};
var auth_default = auth;

// src/types/index.ts
var USER_ROLE = {
  maintainer: "maintainer",
  contributor: "contributor"
};

// src/modules/users/user.route.ts
var router = Router();
router.get("/", auth_default(USER_ROLE.maintainer), userController.getAllUser);
router.get("/:id", userController.getSingleUser);
var userRoute = router;

// src/modules/issues/issues.route.ts
import { Router as Router2 } from "express";

// src/modules/issues/issues.service.ts
var issueCreateIntoDB = async (payload) => {
  const { title, description, type, status, reporter_id } = payload;
  const user = await pool.query(
    `
    SELECT * FROM users WHERE id=$1
    
    `,
    [reporter_id]
  );
  if (user.rows.length === 0) {
    throw new Error("User not found");
  }
  const finalStatus = status ?? "open";
  const result = await pool.query(
    `
        INSERT INTO issues (title,description, type, status, reporter_id ) VALUES($1,$2,$3, $4, $5) RETURNING *
        
        `,
    [title, description, type, finalStatus, reporter_id]
  );
  return result;
};
var getIssueFromDB = async (req) => {
  const { sort = "newest", type, status } = req.query;
  let query = `
    SELECT *
    FROM issues
  `;
  const conditions = [];
  if (type) {
    conditions.push(`type = '${type}'`);
  }
  if (status) {
    conditions.push(`status = '${status}'`);
  }
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }
  query += sort === "oldest" ? ` ORDER BY created_at ASC` : ` ORDER BY created_at DESC`;
  const issuesResult = await pool.query(query);
  const issues = issuesResult.rows;
  if (issues.length === 0) return [];
  const reporterIds = [...new Set(issues.map((i) => i.reporter_id))];
  const usersResult = await pool.query(
    `
    SELECT id, name, role
    FROM users
    WHERE id = ANY($1)
    `,
    [reporterIds]
  );
  const userMap = /* @__PURE__ */ new Map();
  usersResult.rows.forEach((u) => {
    userMap.set(u.id, u);
  });
  const finalData = issues.map((issue) => ({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    type: issue.type,
    status: issue.status,
    reporter: userMap.get(issue.reporter_id) || null,
    created_at: issue.created_at,
    updated_at: issue.updated_at
  }));
  return finalData;
};
var getSingleIssueFromDB = async (id) => {
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
    [id]
  );
  return result;
};
var updateIssueFromDB = async (id, body, user) => {
  const { title, description, type } = body;
  const issueResult = await pool.query(
    `
     SELECT * FROM issues WHERE id=$1
    
    `,
    [id]
  );
  if (issueResult.rows.length === 0) {
    throw new Error("Issue Not Found");
  }
  const issue = issueResult.rows[0];
  if (user?.role === "contributor") {
    if (issue.reporter_id !== user.id) {
      throw new Error("FORBIDDEN_NOT_OWNER");
    }
    if (issue.status !== "open") {
      throw new Error("FORBIDDEN_STATUS");
    }
  }
  const result = await pool.query(
    `
  UPDATE issues
  SET 
  title= COALESCE($1, title),
  description=COALESCE($2, description),
  type=COALESCE($3, type)
  WHERE id=$4 RETURNING *
  
  
  
  
  `,
    [title, description, type, id]
  );
  return result;
};
var deleteIssueFromDB = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM issues WHERE id=$1
    
    `,
    [id]
  );
  return result;
};
var issueService = {
  issueCreateIntoDB,
  getIssueFromDB,
  getSingleIssueFromDB,
  updateIssueFromDB,
  deleteIssueFromDB
};

// src/modules/issues/issues.controller.ts
var createIssue = async (req, res) => {
  try {
    const reporter_id = req.user?.id;
    const payload = {
      ...req.body,
      reporter_id
    };
    const result = await issueService.issueCreateIntoDB(payload);
    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
      //   data: result.rows[0],
    });
  }
};
var getAllIssue = async (req, res) => {
  try {
    const result = await issueService.getIssueFromDB(req);
    res.status(200).json({
      success: true,
      message: "Issues retrived successfully",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var getSingleIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.getSingleIssueFromDB(id);
    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "issues not found",
        data: {}
      });
    }
    res.status(200).json({
      success: true,
      message: "Issue retrived successfully",
      data: result.rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var updateIssue = async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  try {
    const result = await issueService.updateIssueFromDB(
      id,
      body,
      req.user
    );
    if (result.rowCount === 0) {
      throw new Error("forbidden");
    }
    res.status(200).json({
      success: true,
      message: "Issue update successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
      //   data: result.rows[0],
    });
  }
};
var deleteIssue = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await issueService.deleteIssueFromDB(id);
    if (result.rowCount === 0) {
      throw new Error("Issue Not Found");
    }
    res.status(200).json({
      success: true,
      message: "Issue deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
      //   data: result.rows[0],
    });
  }
};
var issueController = {
  createIssue,
  getAllIssue,
  getSingleIssue,
  updateIssue,
  deleteIssue
};

// src/modules/issues/issues.route.ts
var router2 = Router2();
router2.post("/", auth_default("contributor", "maintainer"), issueController.createIssue);
router2.get("/", issueController.getAllIssue);
router2.get("/:id", issueController.getSingleIssue);
router2.patch("/:id", auth_default("maintainer", "contributor"), issueController.updateIssue);
router2.delete("/:id", auth_default("maintainer"), issueController.deleteIssue);
var issuesRouter = router2;

// src/modules/auth/auth.route.ts
import { Router as Router3 } from "express";

// src/modules/auth/auth.service.ts
import bcrypt2 from "bcrypt";
import jwt2 from "jsonwebtoken";
var loginUserIntoDB = async (payload) => {
  const { email, password } = payload;
  const userData = await pool.query(
    `
    SELECT * FROM users WHERE email=$1
    
    `,
    [email]
  );
  if (userData.rows.length === 0) {
    throw new Error("Invalid credentials");
  }
  const user = userData.rows[0];
  const matchPassword = await bcrypt2.compare(password, user.password);
  if (!matchPassword) {
    throw new Error("Invalid credentials");
  }
  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const Token = jwt2.sign(jwtPayload, env_default.secret, {
    expiresIn: "7d"
  });
  delete user.password;
  return {
    Token,
    user
  };
};
var signupUserFromDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashPassword = await bcrypt2.hash(password, 10);
  const finalRole = role ?? "contributor";
  const result = await pool.query(
    `
    INSERT INTO users(name, email, password, role) VALUES($1,$2,$3, $4) RETURNING name, email, role,created_at,updated_at 
    `,
    [name, email, hashPassword, finalRole]
  );
  return result;
};
var authServiece = {
  loginUserIntoDB,
  signupUserFromDB
};

// src/modules/auth/auth.controller.ts
var loginUser = async (req, res) => {
  try {
    const result = await authServiece.loginUserIntoDB(req.body);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
    });
  }
};
var signupUser = async (req, res) => {
  try {
    const result = await authServiece.signupUserFromDB(req.body);
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      error
      //   data: result.rows[0],
    });
  }
};
var authController = {
  loginUser,
  signupUser
};

// src/modules/auth/auth.route.ts
var router3 = Router3();
router3.post("/login", authController.loginUser);
router3.post("/signup", authController.signupUser);
var authRoute = router3;

// src/app.ts
var app = express();
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Express Server",
    author: "Sazzad Hasan"
  });
});
app.use("/api/users", userRoute);
app.use("/api/issues", issuesRouter);
app.use("/api/auth", authRoute);
var app_default = app;

// src/server.ts
var main = () => {
  initDB();
  app_default.listen(env_default.port, () => {
    console.log(`Example app listening on port ${env_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map