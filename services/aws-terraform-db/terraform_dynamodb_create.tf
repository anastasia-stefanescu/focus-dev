provider "aws" {
  region = "us-east-1"  # change if needed
}

resource "aws_dynamodb_table" "user_activity_events" {
  name         = "user_activity_events"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk"
  range_key = "start"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "start"
    type = "S"
  }

  attribute {
    name = "projectName"
    type = "S"
  }

  attribute {
    name = "branch"
    type = "S"
  }

  global_secondary_index {
    name            = "project_start_index"
    hash_key        = "projectName"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "branch_start_index"
    hash_key        = "branch"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user_start_index"
    hash_key        = "userId"
    range_key       = "start"
    projection_type = "ALL"
  }

  tags = {
    Environment = "dev"
    Name        = "user_activity_events"
  }
}

resource "aws_dynamodb_table" "window_focus" {
  name         = "window_focus"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "pk"
  range_key = "start"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "projectName"
    type = "S"
  }

  attribute {
    name = "start"
    type = "S"
  }

  attribute {
    name = "branch"
    type = "S"
  }

  global_secondary_index {
    name            = "project_start_index"
    hash_key        = "projectName"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "branch_start_index"
    hash_key        = "branch"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user_start_index"
    hash_key        = "userId"
    range_key       = "start"
    projection_type = "ALL"
  }

  tags = {
    Name = "window_focus"
  }
}

resource "aws_dynamodb_table" "success_indicators" {
  name         = "success_indicators"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "pk"
  range_key = "start"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "projectName"
    type = "S"
  }

  attribute {
    name = "start"
    type = "S"
  }

  attribute {
    name = "branch"
    type = "S"
  }

  global_secondary_index {
    name            = "project_start_index"
    hash_key        = "projectName"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "branch_start_index"
    hash_key        = "branch"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user_start_index"
    hash_key        = "userId"
    range_key       = "start"
    projection_type = "ALL"
  }

  tags = {
    Name = "success_indicators"
  }
}

resource "aws_dynamodb_table" "execution_events" {
  name         = "execution_events"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "pk"
  range_key = "start"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "projectName"
    type = "S"
  }

  attribute {
    name = "start"
    type = "S"
  }

  attribute {
    name = "branch"
    type = "S"
  }

  global_secondary_index {
    name            = "project_start_index"
    hash_key        = "projectName"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "branch_start_index"
    hash_key        = "branch"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user_start_index"
    hash_key        = "userId"
    range_key       = "start"
    projection_type = "ALL"
  }

  tags = {
    Name = "execution_events"
  }
}

resource "aws_dynamodb_table" "document_change_events" {
  name         = "document_change_events"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "pk"
  range_key = "start"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "projectName"
    type = "S"
  }

  attribute {
    name = "source"
    type = "S"
  }

  attribute {
    name = "start"
    type = "S"
  }

  attribute {
    name = "branch"
    type = "S"
  }

  global_secondary_index {
    name            = "project_start_index"
    hash_key        = "projectName"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "branch_start_index"
    hash_key        = "branch"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "source_start_index"
    hash_key        = "source"
    range_key       = "start"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "user_start_index"
    hash_key        = "userId"
    range_key       = "start"
    projection_type = "ALL"
  }

  tags = {
    Name = "document_change_events"
  }
}
