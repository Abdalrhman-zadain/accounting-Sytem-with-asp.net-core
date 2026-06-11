module.exports = {
  apps: [
    {
      name: 'account-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3000,
        NEXT_PUBLIC_API_BASE_URL: 'https://sabina.trusttechlimited.com/api'
      }
    },
    {
      name: 'account-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3007,
        DATABASE_URL: 'postgresql://simple_account_user:simple_account_pass@localhost:15432/simple_account?schema=public',
        INVENTORY_ACCOUNTING_ENABLED: 'true'
      }
    }
  ]
};
