# Outputs are exported as modules are implemented (e.g. api_url, db_endpoint,
# cognito_user_pool_id). Kept empty in the M0 skeleton.

output "environment" {
  description = "The environment this state manages."
  value       = var.environment
}
