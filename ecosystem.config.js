module.exports = {
  apps: [
    {
      name: "tdb-pmi",
      script: "src/main.ts",
      interpreter: "bun", // Use Bun as the interpreter
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
