describe("Token Faucet", () => {
  require("./token/initialize-token");
  require("./user/initialize-user");
  require("./user/mint");
  require("./token/token-limiter");
  require("./user/close-user");
});
