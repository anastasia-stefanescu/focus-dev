provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "flask_server" {
  ami           = "ami-0fc5d935ebf8bc3bc" # Ubuntu 22.04 in us-east-1
  instance_type = "t2.micro"
  subnet_id     = "subnet-0dc035995ed40e812"       # <<< your subnet in the given VPC
  key_name      = "flask-api-server-rsa-key"              # <<< your SSH key

  vpc_security_group_ids = [
    "sg-02a0d30dfc17b9ca7", # launch-wizard-1
    "sg-016955aa99102b8cb"  # lambda-sg
  ]

  user_data = <<EOF
              #cloud-config
              runcmd:
                - apt update -y
                - apt install -y python3-pip git
                - |
                  cd /opt && \
                  git clone https://github.com/anastasia-stefanescu/Flask-server flask-app && \
                  cd flask-app && \
                  pip3 install -r requirements.txt && \
              EOF


  tags = {
    Name = "FlaskServer"
  }
}
