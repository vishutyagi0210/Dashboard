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
3. Paste the `Name` provided by the AWS command. *(Note: If your provider is Hostinger, only paste the first part of the Name, e.g., `_5ac1fd08...dashboard`, because Hostinger automatically appends `.tyagi.fun` to the end!)*
4. Paste the `Value` into the Target box.
5. Wait 5-15 minutes for AWS to verify your domain ownership. You can check the status in the AWS ACM console (make sure your region is us-east-1)—it will say **Issued** in green when ready.

---

## Step 3: Map Domain to S3 via CloudFront

Once the SSL Certificate is issued, configure the CloudFront CDN using the AWS Management Console. 
Follow the multi-step "Create Distribution" wizard:

**Step 1: Get started**
- **Distribution name**: `dashboard-tyagi-fun` (or whatever you prefer).
- **Distribution type**: Select "Single website or app".
- **Domain**: Leave this entirely blank! (Since your domain is on Hostinger, not Route 53, the wizard will force us to add it *after* creation).

**Step 2: Specify origin**
- **Origin domain**: Paste your exact S3 Website Endpoint here (e.g., `vishal-dashboard-data-2026.s3-website.ap-south-1.amazonaws.com`). If a yellow box pops up, click the "Use website endpoint" button.
- **Viewer protocol policy**: Scroll down to Default Cache Behavior and choose **Redirect HTTP to HTTPS**.

**Step 3: Enable security**
- **Web Application Firewall (WAF)**: Choose **Do not enable security protections** (to avoid extra AWS charges).

*(Note: Step 4 will be skipped since you left Domain blank)*

**Step 4: Review and create**
- Click **Create distribution** at the bottom.

**Step 5: Add Custom Domain & SSL (Important!)**
Once the distribution is created and you are on its detail page:
1. Go to the **General** tab and click **Edit** under **Settings**.
2. **Alternate domain name (CNAME)**: Click "Add item" and type exactly `dashboard.tyagi.fun`. 
   > [!WARNING]
   > Do NOT click the "Route domains to CloudFront" button! That button is only for domains managed by AWS Route 53. Since your domain is on Hostinger, clicking it will cause errors or unnecessary charges.
3. **Custom SSL certificate**: Select the ACM certificate you validated in Step 2.
4. **Default root object**: Type `index.html`.
5. Click **Save changes**.

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

---

## Troubleshooting

### 1. CloudFront shows a blank page or Access Denied
Ensure that in **Step 3 (Step 2: Specify origin)** you pasted the S3 **Website Endpoint** (ending in `s3-website.ap-south-1.amazonaws.com`) and NOT the standard S3 REST endpoint.

### 2. CloudFront throws a "504 Gateway Timeout" Error
This happens if CloudFront tries to talk to the S3 bucket using HTTPS. S3 website endpoints do not support HTTPS! 
**Fix:** Go to your CloudFront distribution -> **Origins** tab -> Select your origin and click **Edit** -> Scroll to **Protocol** and change it to **HTTP only**. Save changes and wait 3 minutes.

### 3. GitHub Action fails with "Unauthorized" when pulling from GHCR
GitHub Container Registry (GHCR) images default to private. To fix this, ensure your workflow logs into Docker using the `GITHUB_TOKEN` before running the image, and ensure the job has `packages: read` permissions.

### 4. DNS CNAME not resolving
Ensure you did not accidentally create a duplicate domain ending (e.g., `dashboard.tyagi.fun.tyagi.fun`). Hostinger automatically appends your root domain to the Name field.
