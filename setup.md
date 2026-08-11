# AWS Deployment Setup Guide

This guide walks you through deploying the static React dashboard to an AWS S3 Bucket (in Mumbai) and serving it globally via CloudFront with a free SSL certificate for the custom domain (`dashboard.tyagi.fun`).

## Architecture Overview
- **S3 Bucket (`ap-south-1`)**: Hosts the static website files.
- **ACM Certificate (`us-east-1`)**: Provides the free SSL certificate.
- **CloudFront (Global CDN)**: Serves the S3 content over HTTPS to the custom domain.
- **IAM**: Provides GitHub Actions the credentials needed to sync files to S3.

> [!IMPORTANT]
> Ensure you have the AWS CLI installed and configured (`aws configure`) before running these commands.

---

## Step 1: Create the S3 Bucket & Configure IAM

Run the following commands in your terminal. This will create the S3 bucket in Mumbai, make it publicly accessible for web hosting, and generate the IAM credentials needed for GitHub Actions.

```bash
# 1. Variables
export BUCKET_NAME="vishal-dashboard-data-2026"
export AWS_REGION="ap-south-1" # Mumbai

# 2. Create the S3 Bucket in Mumbai
aws s3api create-bucket \
    --bucket $BUCKET_NAME \
    --region $AWS_REGION \
    --create-bucket-configuration LocationConstraint=$AWS_REGION

# 3. Disable Block Public Access
aws s3api put-public-access-block \
    --bucket $BUCKET_NAME \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 4. Enable Web Hosting
aws s3api put-bucket-website \
    --bucket $BUCKET_NAME \
    --website-configuration '{"IndexDocument": {"Suffix": "index.html"},"ErrorDocument": {"Key": "index.html"}}'

# 5. Apply Public Read Policy
aws s3api put-bucket-policy \
    --bucket $BUCKET_NAME \
    --policy '{"Version": "2012-10-17","Statement": [{"Sid": "PublicReadGetObject","Effect": "Allow","Principal": "*","Action": "s3:GetObject","Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"}]}'

# 6. Create GitHub Actions IAM User & Policy
aws iam create-user --user-name github-actions-dashboard-deployer

aws iam put-user-policy \
    --user-name github-actions-dashboard-deployer \
    --policy-name GitHubActionsS3DeployPolicy \
    --policy-document '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": ["s3:PutObject","s3:GetObject","s3:ListBucket","s3:DeleteObject"],"Resource": ["arn:aws:s3:::'$BUCKET_NAME'","arn:aws:s3:::'$BUCKET_NAME'/*"]}]}'

# 7. Generate Access Keys
aws iam create-access-key --user-name github-actions-dashboard-deployer
```

> [!WARNING]
> Save the `AccessKeyId` and `SecretAccessKey` from the final command! You will need to add these to your GitHub Repository Secrets as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.

---

## Step 2: Request Free SSL Certificate (ACM)

To use HTTPS on your custom domain, you must request a free SSL certificate. 
*Note: CloudFront requires this certificate to be generated in `us-east-1` (N. Virginia), even though your S3 bucket is in Mumbai.*

```bash
# Request the Certificate
aws acm request-certificate \
    --domain-name dashboard.tyagi.fun \
    --validation-method DNS \
    --region us-east-1
```
Copy the `CertificateArn` from the output and run the next command to get your DNS validation records:

```bash
# Get DNS Validation Records
aws acm describe-certificate \
    --certificate-arn <PASTE_CERTIFICATE_ARN_HERE> \
    --region us-east-1 \
    --query "Certificate.DomainValidationOptions"
```

**Validate in Hostinger:**
1. Open your DNS Zone Editor in Hostinger.
2. Create a new **CNAME** record.
3. Paste the `Name` and `Value` provided by the previous AWS command.
4. Wait 5-10 minutes for AWS to verify your domain ownership.

---

## Step 3: Map Domain to S3 via CloudFront

Once the SSL Certificate is issued, configure the CloudFront CDN using the AWS Management Console:

1. Log into the AWS Console and go to **CloudFront** -> **Create Distribution**.
2. **Origin Domain**: Select your S3 bucket (e.g., `vishal-dashboard-data-2026.s3.ap-south-1.amazonaws.com`).
3. **Viewer Protocol Policy**: Choose **Redirect HTTP to HTTPS**.
4. **Alternate domain name (CNAME)**: Enter `dashboard.tyagi.fun`.
5. **Custom SSL certificate**: Select the ACM certificate you just validated.
6. **Default root object**: Enter `index.html`.
7. Click **Create Distribution**.

---

## Step 4: Final DNS Setup

Once your CloudFront distribution is deployed, it will generate a domain name like `d111222abcdef.cloudfront.net`.

1. Go back to your Hostinger DNS Zone Editor.
2. Create a final **CNAME** record.
3. **Name**: `dashboard`
4. **Target/Value**: `d111222abcdef.cloudfront.net`

## GitHub Actions Secrets Required
To enable the `.github/workflow/cd-dashboard.yml` workflow, ensure you have added the following secrets to your GitHub repository:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (Set to `ap-south-1`)
- `AWS_S3_BUCKET` (The exact name of your bucket)
