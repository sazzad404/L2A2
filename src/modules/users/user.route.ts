import { Router, type Request, type Response } from "express";
import { pool } from "../../DB";

const router = Router()
router.post("/", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  try {
    const result = await pool.query(
      `
    INSERT INTO users(name, email, password, role) VALUES($1,$2,$3, $4) RETURNING name, email, role
    `,
      [name, email, password, role],
    );
    console.log(result);

    res.status(201).json({
      message: "Created successfully!!",
      data: result.rows[0],
    });
  } catch (error: any) {
    res.status(500).json({
      message: error.message,
      error: error,
      //   data: result.rows[0],
    });
  }
});


export const userRoute = router