import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  usuario?: { idUsuario: number };
}

const authDriverMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token no proporcionado" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "clave_secreta"
    ) as { idUsuario: number };

    req.user = { idUsuario: decoded.idUsuario };
    next();
  } catch (error) {
    res.status(403).json({ message: "Token inválido" });
  }
};

export default authDriverMiddleware;