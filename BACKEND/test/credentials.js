const crypto = require("crypto");

const generatedPassword = () => `Tk${crypto.randomBytes(8).toString("hex")}7`;

module.exports = {
  PASSWORD: generatedPassword(),
  NEW_PASSWORD: generatedPassword(),
  OTHER_PASSWORD: generatedPassword(),
  WRONG_PASSWORD: generatedPassword(),
  randomSecret: () => crypto.randomBytes(32).toString("hex"),
};
