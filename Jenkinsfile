def ECR_REGISTRY = '350801433917.dkr.ecr.eu-west-1.amazonaws.com'
def ECR_REPO     = 'products/smart-hospital/sh-config-service-central-ui'
def IMAGE        = "${ECR_REGISTRY}/${ECR_REPO}"
def VERSION      = ''

pipeline {
    agent { label 'smarthospital' }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                cleanWs()
                checkout scm
            }
        }

        stage('Setup') {
            steps {
                script {
                    VERSION = sh(script: "node -p \"require('./package.json').version\"", returnStdout: true).trim()
                    echo "Versione: ${VERSION}"
                }
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'smarthospital_aws_key',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    sh """
                        /usr/local/bin/aws configure set aws_access_key_id \$AWS_ACCESS_KEY_ID --profile smarthospital_aws
                        /usr/local/bin/aws configure set aws_secret_access_key \$AWS_SECRET_ACCESS_KEY --profile smarthospital_aws
                        /usr/local/bin/aws configure set default.region eu-west-1 --profile smarthospital_aws
                        /usr/local/bin/aws ecr get-login-password --profile smarthospital_aws | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    """
                }
            }
        }

        stage('Build & Push') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'smarthospital_aws_key',
                    accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                    secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
                ]]) {
                    script {
                        // Crea il repository ECR se non esiste
                        def repoExists = sh(
                            script: "/usr/local/bin/aws ecr describe-repositories --repository-name ${ECR_REPO} --region eu-west-1 --profile smarthospital_aws",
                            returnStatus: true
                        ) == 0
                        if (!repoExists) {
                            echo "Repository ECR non trovato, lo creo: ${ECR_REPO}"
                            sh "/usr/local/bin/aws ecr create-repository --repository-name ${ECR_REPO} --region eu-west-1 --profile smarthospital_aws"
                        }

                        sh """
                            docker build -t ${IMAGE}:${VERSION} -t ${IMAGE}:latest .
                            docker push ${IMAGE}:${VERSION}
                            docker push ${IMAGE}:latest
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -f || true'
            cleanWs()
        }
    }
}
