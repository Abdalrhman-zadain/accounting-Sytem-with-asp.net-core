# QZ Tray signing credentials

Generate files with:

```bash
npm run qz:generate-cert
```

Then set in `backend/.env`:

```
QZ_CERT_PATH=./certs/qz/digital-certificate.txt
QZ_PRIVATE_KEY_PATH=./certs/qz/private-key.pem
```

**Do not commit** `private-key.pem`. The certificate file is safe to copy to cashier PCs for QZ Tray trust setup.
