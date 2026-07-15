variable "aws_region" {
  description = "AWS region for all resources. Must be a HIPAA-eligible region."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "tags" {
  description = "Common tags applied to all resources (used for cost + compliance tracking)."
  type        = map(string)
  default = {
    Project = "healthy-companion"
    Managed = "terraform"
    Data    = "phi"
  }
}
