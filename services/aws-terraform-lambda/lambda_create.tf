provider "aws" {
  region = "us-east-1"
}

resource "aws_iam_role" "lambda_exec_role" {
  name = "lambda_exec_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logging" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "lambda_to_ec2" {
  function_name = "interact_with_cloud_services"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_exec_role.arn
  filename      = "lambda.zip" # your zipped Lambda code
  source_code_hash = filebase64sha256("lambda.zip")

  vpc_config {
    subnet_ids         = [var.subnet_id_1, var.subnet_id_2]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      EC2_IP = var.ec2_private_ip
      EC2_PORT = "8080"
    }
  }
}

resource "aws_security_group" "lambda_sg" {
  name        = "lambda-sg"
  description = "Security group for Lambda"
  vpc_id      = var.vpc_id
}

resource "aws_security_group_rule" "allow_lambda_to_ec2" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  security_group_id        = var.ec2_sg_id # EC2's SG
  source_security_group_id = aws_security_group.lambda_sg.id
}
