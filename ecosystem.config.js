module.exports = {
  apps: [
    {
      name: 'market-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3010,
        NEXT_PUBLIC_API_BASE_URL: 'https://market.trusttechlimited.com/api',
        NEXT_API_PROXY_TARGET: 'http://127.0.0.1:3017/api',
      },
    },
    {
      name: 'market-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run start',
      env: {
        PORT: 3017,
        DATABASE_URL:
          'postgresql://simple_account_user:simple_account_pass@localhost:15433/simple-account-pos-m-ch?schema=public',
        INVENTORY_ACCOUNTING_ENABLED: 'true',
        QZ_CERT_PATH: './certs/qz/digital-certificate.txt',
        QZ_PRIVATE_KEY_PATH: './certs/qz/private-key.pem',
        QZ_SIGNING_ENABLED: 'false',
      },
    },
  ],
};
