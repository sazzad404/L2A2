import type { JwtPayload } from "jsonwebtoken";

export interface CustomJwtPayload extends JwtPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
    namespace Express{
        interface Request{
            user?: CustomJwtPayload
        }
    }
}