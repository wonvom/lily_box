const { buildApp } = require("./app");
const { loadConfig } = require("./config");

async function main() {
  const config = loadConfig();
  const app = buildApp({ config });

  try {
    await app.listen({ host: config.host, port: config.port });
    app.log.info(`${config.proxyName} listening on ${config.host}:${config.port}`);
  } catch (error) {
    app.log.error(error);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
