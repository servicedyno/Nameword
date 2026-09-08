const jwt = require('jsonwebtoken');

function generateJwtToken(user, sessionId) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      sessionId: sessionId,
    },
    process.env.JWT_KEY
  );
}

module.exports = {generateJwtToken};
