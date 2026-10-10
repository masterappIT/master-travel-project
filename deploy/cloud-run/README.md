# Cloud Run production operations

本文件是 Cloud Run 的操作 runbook，負責部署執行細節、migration、健康檢查、回滾與 restore drill。系統整體架構、前端服務清單與 CI/CD 全流程請以 [`docs/PRODUCTION-DEPLOYMENT.md`](../../docs/PRODUCTION-DEPLOYMENT.md) 為準。

The API runs as a Cloud Run service backed by Cloud SQL for PostgreSQL. Schema changes run only through a separate Cloud Run Job. The service never runs migrations during startup.

## Ownership boundaries

| Owner | Responsibilities |
| --- | --- |
| Application | Backward-compatible code and migrations, health endpoints, smoke tests, revision rollback decision |
| Platform | Artifact Registry, Cloud Run, Workload Identity Federation, IAM, Secret Manager, monitoring and release environment protection |
| Database | Cloud SQL availability, automated backups, point-in-time recovery, restore drills and migration review |

Production access must use separate runtime, migration, and GitHub deploy service accounts. The runtime account needs Cloud SQL Client and secret access only. The migration account needs those permissions plus database migration credentials. The deploy account may update the service/job, push images, execute jobs, and create backups, but must not read secret values directly.

## Required resources

- Artifact Registry Docker repository.
- Publicly invokable Cloud Run API and share-renderer services, plus a non-public migration job in the same region as Cloud SQL. The renderer uses Playwright only, has at least 1Gi memory and concurrency 1, and accepts only invite-token image requests. Set `GCP_SHARE_IMAGE_BUCKET` to the private Cloud Storage bucket used for cross-instance share-image caching (defaults to `master-travel-share-images`).
- Cloud SQL PostgreSQL with high availability as required, automated backups, point-in-time recovery, deletion protection, and a private or approved connector path.
- Secret Manager secrets for `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `SUPPORT_AGENT_SESSION_SECRET`.
- GitHub `production` Environment with required reviewers and the variables referenced by `deploy-production.yml`, including `DRIVER_ORDER_URL_BASE` set to the absolute HTTPS driver Web URL ending in `/order-invite`, `GCP_SHARE_RENDERER_SERVICE`, and `SHARE_RENDERER_ORIGIN` set to that renderer's HTTPS Cloud Run URL.
- Workload Identity Federation restricted to this repository and production environment.

`DATABASE_URL` should use the Cloud SQL Unix socket supported by the Cloud Run connector, for example `postgresql://USER:PASSWORD@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE&schema=public`. Store the complete value in Secret Manager.

## Release flow

1. Trigger **Deploy Production** from an immutable commit on `main`.
2. All quality gates must pass.
3. The workflow builds and pushes the API image and resolves its digest.
4. Cloud SQL creates an on-demand pre-migration backup. Do not continue if it fails.
5. The deployment script updates the share renderer, waits for its new revision to become Ready, verifies the immutable image and confirms that revision receives 100% traffic, then runs Prisma migration in the migration job using the API image digest. A migration failure stops subsequent deployment and prints the execution conditions plus recent Cloud Logging entries; it does not automatically roll back the renderer.
6. The first revision creates the service and is tested immediately at its public URL.
7. Later revisions deploy as candidates with no production traffic. Readiness failures print the Cloud Run conditions, revision image, and expected image.
8. `/health/live` and `/health/ready` smoke tests run against the candidate URL.
9. Before promotion, the target revision and image are printed. Only a successful candidate receives 100% traffic; the promotion result prints the serving revision and immutable image digest and is verified again.
10. Monitor the release for at least 30 minutes before closing the change. If rollback is required, `rollback.sh` verifies that the requested revision is serving 100% traffic and that its image matches the requested revision before running smoke tests.

API and frontend deployment scripts verify the created revision's immutable image and
read the `Ready` condition by type from Cloud Run JSON using `revision-ready.py`.
Do not use `status.conditions[?type=Ready].status` as a gcloud projection: it can
return an empty value even when the revision is healthy. After promotion, the
serving revision, 100% traffic, and image digest must match the release target.
Validate readiness parsing locally with
`PYTHONDONTWRITEBYTECODE=1 python3 deploy/cloud-run/test_revision_ready.py`.

Migrations must follow expand/contract: add backward-compatible structures first, deploy compatible code, migrate data, then remove old structures in a later release. Never use automatic down migrations in production.

## Health boundaries

- `GET /health/live`: process liveness only. Use for Cloud Run startup and liveness probes.
- `GET /health/ready`: runs `SELECT 1` and returns 503 on query failure; the handler does not set its own query timeout. Use for release and external availability checks.
- `GET /health`: compatibility alias for readiness.

Do not use dependency readiness as a liveness probe; a database incident must not create a restart loop.

## Monitoring and alerts

Platform ownership must provision dashboards and paging alerts for:

- Cloud Run request 5xx ratio above 2% for 5 minutes.
- p95 latency above the agreed SLO for 10 minutes.
- zero healthy instances or repeated startup/liveness probe failures.
- external `/health/ready` failure from at least two regions for 3 minutes.
- Cloud SQL CPU, storage, memory, connection saturation, replication/PITR health, and backup failure.
- migration job failure and production workflow failure.

Cloud Logging retention and access must match the organization policy. Application logs must not contain credentials, session tokens, authorization headers, or personal data beyond approved operational identifiers.

## Rollback and incident flow

For an application regression, find the last verified revision and run:

```bash
PROJECT_ID=... REGION=... SERVICE_NAME=... REVISION=... ./deploy/cloud-run/rollback.sh
```

This moves all traffic to that revision and reruns smoke tests. If the new migration remains backward-compatible, leave it applied. If it is not compatible or data integrity is at risk, stop writes, involve the database owner, and prefer a reviewed forward-fix. Restore from backup/PITR only after declaring an incident and recording the recovery point because restoration creates a separate instance and can discard later writes.

After rollback, preserve the failed revision and logs, record the image digest and migration execution, and open an incident review.

## Backup restore drill

At least quarterly, the database owner must restore the latest backup or a selected PITR timestamp into an isolated Cloud SQL instance, connect a non-production API revision, run `/health/ready` plus read-only critical-path checks, record recovery time and recovery point, then destroy the isolated resources. Backup configuration without a successful restore drill is not considered verified.
