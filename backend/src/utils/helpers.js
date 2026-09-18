const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getJwtSecret } = require("../config/security");

const generateToken = (id, role, schoolId) =>
  jwt.sign({ id, role, schoolId }, getJwtSecret(), { expiresIn: "7d" });

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const hashPassword = (p) => bcrypt.hash(p, 12);
const generatePassword = () => Math.random().toString(36).slice(-6) + "A1!";

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { generateToken, generateOTP, hashPassword, generatePassword, AppError };
