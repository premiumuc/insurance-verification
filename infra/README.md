# infra — Terraform

Infrastructure as code for Healthy Companion on AWS (HIPAA-eligible services only; see
[`../docs/08-devops-and-launch.md`](../docs/08-devops-and-launch.md)).

> **Status: skeleton.** This is the M0 baseline layout with variables and module
> placeholders. Resources are filled in per milestone (RDS in M2, Cognito in M1, Bedrock
> access in M3, etc.). Nothing here is applied yet — apply only from a machine with a
> signed AWS BAA and least-privilege credentials.

## Layout

```
infra/
├─ main.tf          # providers, backend, module wiring
├─ variables.tf     # inputs (region, env, cidr, sizes)
├─ outputs.tf       # exported values
├─ versions.tf      # required providers/versions
└─ modules/         # network, data, identity, compute, ai (added per milestone)
```

## Environments

State is per-environment (dev/staging/prod), ideally in separate AWS accounts. Never
copy prod PHI to lower environments. Configure remote state (S3 + DynamoDB lock) before
first apply — see the commented backend block in `main.tf`.

## Usage (once modules are implemented)

```bash
cd infra
terraform init
terraform workspace select staging || terraform workspace new staging
terraform plan -var-file=staging.tfvars   # tfvars are gitignored
```
