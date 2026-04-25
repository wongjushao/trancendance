Generate local TLS certs for the WAF with:

```bash
./scripts/generate-local-certs.sh
```

This creates:

- `waf/certs/localhost.crt`
- `waf/certs/localhost.key`
- `waf/certs/internal-ca.crt`
- `waf/certs/internal-ca.key`
- `waf/certs/internal-services.crt`
- `waf/certs/internal-services.key`

`localhost.*` is for local edge testing.

`internal-ca.*` and `internal-services.*` are for encrypted service-to-service traffic in local development and should not be used in production.
