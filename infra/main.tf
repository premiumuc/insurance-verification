# Healthy Companion — root Terraform configuration (M0 skeleton).
#
# Modules are wired in per milestone. Everything that touches PHI must live inside the
# VPC private subnets and use KMS-backed encryption. See docs/08.

# --- Remote state (uncomment and configure before first real apply) ---
# terraform {
#   backend "s3" {
#     bucket         = "healthy-companion-tfstate-<account>"
#     key            = "env/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "healthy-companion-tflock"
#     encrypt        = true
#   }
# }

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = merge(var.tags, { Environment = var.environment })
  }
}

# ---------------------------------------------------------------------------
# Modules (implemented per milestone — placeholders documented here so the shape
# of the system is visible from day one).
# ---------------------------------------------------------------------------

# module "network" {          # M0/M1 — VPC, subnets (public/private), NAT, endpoints
#   source      = "./modules/network"
#   environment = var.environment
#   vpc_cidr    = var.vpc_cidr
# }

# module "identity" {         # M1 — Cognito user pool, app clients, MFA, role claims
#   source      = "./modules/identity"
#   environment = var.environment
# }

# module "data" {             # M2 — RDS Postgres (Multi-AZ, KMS), ElastiCache, S3
#   source      = "./modules/data"
#   environment = var.environment
#   vpc_id      = module.network.vpc_id
#   subnet_ids  = module.network.private_subnet_ids
# }

# module "compute" {          # M0 — ECS Fargate service for the API, ALB, WAF
#   source      = "./modules/compute"
#   environment = var.environment
#   vpc_id      = module.network.vpc_id
# }

# module "ai" {               # M3 — Bedrock access (IAM), model config
#   source      = "./modules/ai"
#   environment = var.environment
# }
