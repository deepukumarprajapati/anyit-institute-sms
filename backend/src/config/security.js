const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be configured before starting the server");
  }
  return process.env.JWT_SECRET;
};

module.exports = { getJwtSecret };