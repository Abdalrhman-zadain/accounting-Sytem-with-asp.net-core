module.exports = {
  apps: [
    {
      name: 'market-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3009,
        NEXT_PUBLIC_API_BASE_URL: 'https://market.trusttechlimited.com/api',
        NEXT_API_PROXY_TARGET: 'http://127.0.0.1:3008/api'
      }
    },
    {
      name: 'market-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3008,
        DATABASE_URL: 'postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public',
        INVENTORY_ACCOUNTING_ENABLED: 'true'
      }
    }
  ]
};
