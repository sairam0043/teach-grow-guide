# ☁️ Teach Grow Guide (Cuvasol Tutor) — AWS Enterprise Cloud Architecture

[![Cloud: AWS](https://img.shields.io/badge/Cloud-Amazon%20Web%20Services-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![Frontend: S3 + CloudFront](https://img.shields.io/badge/Frontend-S3%20%2B%20CloudFront%20CDN-569A31?logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)
[![Backend: App Runner / ECS](https://img.shields.io/badge/Compute-AWS%20App%20Runner%20%7C%20ECS%20Fargate-FF9900?logo=amazon-ecs&logoColor=white)](https://aws.amazon.com/apprunner/)
[![Database: DocumentDB](https://img.shields.io/badge/Database-Amazon%20DocumentDB%20(Mongo%20Compatible)-336791?logo=mongodb&logoColor=white)](https://aws.amazon.com/documentdb/)
[![Auth: Cognito](https://img.shields.io/badge/Auth-Amazon%20Cognito%20User%20Pools-DD344C?logo=amazon-cognito&logoColor=white)](https://aws.amazon.com/cognito/)
[![AI: Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock%20(Claude%20%2F%20Titan)-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/bedrock/)
[![Email: SES](https://img.shields.io/badge/Email-Amazon%20SES%20(Simple%20Email)-D9381E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/ses/)

---

## 📖 Table of Contents

1. [Executive Summary & AWS Cloud Vision](#-executive-summary--aws-cloud-vision)
2. [Tech Stack Mapping (Current vs AWS Cloud-Native Alternatives)](#-tech-stack-mapping-current-vs-aws-cloud-native-alternatives)
3. [End-to-End AWS Cloud Architecture Diagrams](#-end-to-end-aws-cloud-architecture-diagrams)
   - [6-Tier AWS Cloud-Native System Topology](#1-6-tier-aws-cloud-native-system-topology)
   - [AWS Cognito Authentication & Token Security Flow](#2-aws-cognito-authentication--token-security-flow)
   - [Booking, Razorpay & Amazon Chime / Meet Lifecycle](#3-booking-razorpay--amazon-chime--meet-lifecycle)
   - [Event-Driven Referral & Wallet Engine (EventBridge + DynamoDB)](#4-event-driven-referral--wallet-engine-eventbridge--dynamodb)
   - [Serverless Financial Payout Engine (AWS Step Functions + SES)](#5-serverless-financial-payout-engine-aws-step-functions--ses)
4. [Database Architecture & AWS Data Model (DocumentDB / Aurora Serverless)](#-database-architecture--aws-data-model-documentdb--aurora-serverless)
5. [Complete AWS Technology Stack Inventory](#-complete-aws-technology-stack-inventory)
6. [AWS-Native Repository & Infrastructure as Code (IaC) Directory Structure](#-aws-native-repository--infrastructure-as-code-iac-directory-structure)
7. [Comprehensive AWS API & Service Architecture Reference](#-comprehensive-aws-api--service-architecture-reference)
8. [AWS Secrets Manager & Systems Manager Parameter Store Reference](#-aws-secrets-manager--systems-manager-parameter-store-reference)
9. [Infrastructure Deployment Playbook (AWS CDK / Terraform / App Runner)](#-infrastructure-deployment-playbook-aws-cdk--terraform--app-runner)
10. [Observability, Monitoring & Security (CloudWatch, X-Ray, WAF & GuardDuty)](#-observability-monitoring--security-cloudwatch-x-ray-waf--guardduty)
11. [AWS High Availability, Disaster Recovery & Cost Optimization](#-aws-high-availability-disaster-recovery--cost-optimization)
12. [Troubleshooting & AWS Migration FAQ](#-troubleshooting--aws-migration-faq)

---

## 🌟 Executive Summary & AWS Cloud Vision

This document details the **100% Amazon Web Services (AWS) enterprise cloud-native architecture** for **Teach Grow Guide (Cuvasol Tutor)**. 

By migrating from serverless multi-vendor platforms to a cohesive AWS ecosystem, the platform gains:
* **99.99% Enterprise High Availability & Multi-AZ Redundancy**
* **Instant Auto-Scaling** from tens of concurrent learners to millions without cold starts
* **Unified Security & Compliance** using AWS IAM, KMS, Secrets Manager, and AWS WAF
* **Serverless Cost Efficiency** where compute, database, and storage scale to match actual traffic

```mermaid
graph LR
    subgraph Users["End Users"]
        S[("👨‍🎓 Students / Parents")]
        T[("👩‍🏫 Tutors")]
        A[("🛡️ Admin")]
        H[("💼 HR / Finance")]
    end

    subgraph AWS_Edge["AWS Edge & Global Delivery"]
        R53["Amazon Route 53 (DNS)"]
        WAF["AWS WAF (Security Shield)"]
        CF["Amazon CloudFront CDN"]
        S3Web["Amazon S3 Static Assets"]
    end

    subgraph AWS_Compute["AWS Application & API Tier"]
        AppRunner["AWS App Runner / ECS Fargate (Node.js API)"]
        Cognito["Amazon Cognito (Identity & Auth)"]
        Bedrock["Amazon Bedrock (GenAI Assistant)"]
    end

    subgraph AWS_Data["AWS Persistence & Storage"]
        DocDB[("Amazon DocumentDB / DynamoDB")]
        S3Files[("Amazon S3 (Encrypted Documents)")]
    end

    subgraph AWS_Integration["AWS Communication & Integrations"]
        SES["Amazon SES (Email Notifications)"]
        Chime["Amazon Chime SDK / Google Meet"]
        Rzp["Razorpay Gateway (via Secrets Mgr)"]
    end

    Users --> R53 --> WAF --> CF --> S3Web
    Users --> CF --> AppRunner
    AppRunner <--> Cognito
    AppRunner <--> Bedrock
    AppRunner <--> DocDB
    AppRunner <--> S3Files
    AppRunner <--> SES
    AppRunner <--> Chime
    AppRunner <--> Rzp
```

---

## 🔄 Tech Stack Mapping (Current vs AWS Cloud-Native Alternatives)

| Architecture Component | Current Tech Stack | AWS Enterprise Alternative | Key Benefits & AWS Capabilities |
| :--- | :--- | :--- | :--- |
| **Frontend CDN & Edge** | Vercel Static Edge | **Amazon CloudFront + AWS WAF** | Global edge PoPs, DDoS mitigation with AWS Shield, custom SSL via ACM |
| **Frontend Storage** | Vercel Build Output | **Amazon S3 (Bucket + OAC)** | 99.999999999% (11 9s) durability, private Origin Access Control |
| **DNS & Domain Manager** | Vercel / Cloudflare DNS | **Amazon Route 53** | Latency-based routing, health checks, automatic SSL renewal via ACM |
| **Backend Compute Tier** | Vercel Serverless / Node.js | **AWS App Runner** or **AWS ECS Fargate** | Zero cold starts, automatic horizontal scaling, VPC security isolation |
| **Primary Database** | MongoDB Atlas Cloud | **Amazon DocumentDB** (or **Amazon Aurora**) | Fully managed MongoDB API compatibility, Multi-AZ automated replication |
| **Authentication & IAM** | Custom JWT + Bcrypt + OAuth | **Amazon Cognito User & Identity Pools** | Built-in MFA, OAuth2 / Google Social federation, JWT token issuance |
| **Media & Document Storage**| Multer (Local disk / uploads) | **Amazon S3 + Presigned URLs** | Scalable document storage, KMS server-side encryption, lifecycle policies |
| **Generative AI Assistant** | Google Gemini SDK | **Amazon Bedrock (Claude 3.5 Sonnet / Titan)** | Enterprise GenAI without data sharing, RAG via Knowledge Bases |
| **Transactional Email / OTP**| Brevo (Sendinblue) SMTP | **Amazon SES (Simple Email Service)** | High deliverability, dedicated IP pools, SNS bounce/complaint webhooks |
| **Video Classroom Engine** | Google Meet API / Jitsi | **Amazon Chime SDK** (or Google Meet) | Embedded in-app interactive video/audio with recording & screen sharing |
| **Asynchronous Events** | Express in-memory tasks | **Amazon EventBridge + Amazon SQS** | Decoupled event bus for wallet rewards, payout notifications, reminders |
| **Scheduled Cron Jobs** | Custom Node.js interval scripts | **Amazon EventBridge Scheduler** | Serverless recurring crons (monthly payouts, bank detail reminders) |
| **Financial Workflow** | In-app procedural loops | **AWS Step Functions** | Visual state machines for multi-step tutor payout validation & disbursement |
| **Secrets & Keys Manager** | `.env` plaintext files | **AWS Secrets Manager + KMS** | Automated credential rotation, envelope encryption with KMS keys |
| **Monitoring & Logs** | `console.log` / runtime output | **Amazon CloudWatch + AWS X-Ray** | Real-time metric alarms, centralized log retention, distributed trace maps |

---

## 🏗️ End-to-End AWS Cloud Architecture Diagrams

### 1. 6-Tier AWS Cloud-Native System Topology

```mermaid
flowchart TD
    %% LAYER 1: END USERS
    subgraph Layer1["1. End Users & Devices"]
        U_Student["👨‍🎓 Students / Parents<br/>(Browse Tutors, Book Sessions, Attend Classes)"]
        U_Tutor["👩‍🏫 Tutors / Educators<br/>(Manage Profile, Availability, Conduct Classes)"]
        U_Admin["🛡️ Platform Administrators<br/>(Manage Users, Content, Monitor Platform)"]
        U_HR["💼 HR / Finance Team<br/>(Handle Commissions, Payouts, Financial Tracking)"]
    end

    %% LAYER 2: AWS EDGE & FRONTEND TIER
    subgraph Layer2["2. AWS Edge & Frontend Tier (Static Web Delivery)"]
        direction TB
        R53["🌐 Amazon Route 53 (DNS & Health Checks)"]
        WAF["🛡️ AWS WAF (Web Application Firewall & Rate Limiting)"]
        CF["⚡ Amazon CloudFront (Global CDN with ACM SSL Certificate)"]
        S3_Web["🪣 Amazon S3 Static Website Bucket<br/>(React 18 + TypeScript + Vite + Tailwind CSS SPA)"]
        
        R53 --> WAF --> CF -->|Origin Access Control| S3_Web
    end

    %% LAYER 3: AWS COMPUTE & API TIER
    subgraph Layer3["3. AWS Application & Compute Tier (Containerized / Serverless)"]
        direction TB
        ALB["⚖️ Application Load Balancer / App Runner Ingress"]
        AppRunner["🚀 AWS App Runner / Amazon ECS Fargate<br/>(Express 5 REST API Container on Node.js 20 LTS)"]
        CognitoAuth["🔑 Amazon Cognito User Pools<br/>(JWT Token Authorizer & Google Social Federation)"]
        
        ALB --> AppRunner
        AppRunner <--> CognitoAuth
    end

    %% LAYER 4: AWS DATABASE & PERSISTENCE
    subgraph Layer4["4. AWS Database & Storage Tier"]
        DocDB[("🍃 Amazon DocumentDB (MongoDB 5.0 Compatible Cluster)<br/>Multi-AZ Replication, Auto-Scalable Storage")]
        S3_Docs[("🪣 Amazon S3 Secure Storage (KMS Encrypted)<br/>Tutor Verification Certificates & User Avatars")]
    end

    %% LAYER 5: AWS AI & ENTERPRISE INTEGRATION SERVICES
    subgraph Layer5["5. AWS AI, Communication & External Integrations"]
        Bedrock["✨ Amazon Bedrock GenAI<br/>(Claude 3.5 Sonnet / Knowledge Base RAG Support)"]
        SES["📧 Amazon SES (Simple Email Service)<br/>(Transactional OTPs, Invoices, Payout Receipts)"]
        ChimeSDK["📹 Amazon Chime SDK / Google Meet Gateway<br/>(HD Video Classrooms & Screen Sharing)"]
        RazorpayGW["💳 Razorpay Payment Gateway<br/>(Managed Webhooks & Secrets via AWS Secrets Manager)"]
    end

    %% LAYER 6: AWS MANAGEMENT, SECURITY & CI/CD
    subgraph Layer6["6. AWS Governance, Security & Observability"]
        SecMgr["🔐 AWS Secrets Manager & KMS<br/>(Encryption & Automated Key Rotation)"]
        CloudWatch["📈 Amazon CloudWatch & AWS X-Ray<br/>(Centralized Logs, Metrics & Distributed Tracing)"]
        CodePipeline["🔄 AWS CodePipeline & ECR<br/>(Automated CI/CD from GitHub to App Runner)"]
    end

    %% INTER-LAYER CONNECTIVITY
    Layer1 <--> Layer2
    Layer2 <--> Layer3
    AppRunner <--> Layer4
    AppRunner <--> Layer5
    Layer3 --- Layer6
    Layer4 --- Layer6
```

---

### 2. AWS Cognito Authentication & Token Security Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Tutor / Admin
    participant UI as React SPA (CloudFront)
    participant Cognito as Amazon Cognito User Pool
    participant SNS as Amazon SNS (SMS / OTP)
    participant SES as Amazon SES (Email OTP)
    participant API as AWS App Runner API
    participant DocDB as Amazon DocumentDB

    alt Email/Password Registration with Cognito OTP
        User->>UI: Enter Name, Email, Password, Role
        UI->>Cognito: signUp(email, password, userAttributes: { role, full_name })
        Cognito->>SES: Trigger Custom Message Lambda / Send Verification Code
        SES-->>User: Delivers 6-digit confirmation code
        User->>UI: Enters verification code
        UI->>Cognito: confirmSignUp(email, confirmationCode)
        Cognito-->>UI: User Confirmed & Active
    else Google OAuth 2.0 Social Federation
        User->>UI: Clicks "Sign in with Google"
        UI->>Cognito: Initiate Hosted UI / OAuth2 Google Identity Provider
        Cognito-->>UI: Return Cognito JWT Tokens (IdToken, AccessToken, RefreshToken)
    end

    UI->>API: API Request with Header: Authorization: Bearer <Cognito_IdToken>
    API->>API: Verify JWT Signature using Cognito JWKS Public Keys
    API->>DocDB: Read / Sync User Profile Data
    API-->>UI: Return Role-Guarded Application Payload
```

---

### 3. Booking, Razorpay & Amazon Chime / Meet Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student
    actor Tutor as Tutor
    participant UI as React Client (S3/CloudFront)
    participant API as AWS App Runner API
    participant SecMgr as AWS Secrets Manager
    participant RZP as Razorpay Gateway
    participant DocDB as Amazon DocumentDB
    participant Chime as Amazon Chime SDK / Meet
    participant SES as Amazon SES

    Student->>UI: Selects Subject, Timing & Payment Plan
    alt Free Demo Booking
        UI->>API: POST /api/tutors/:id/book { timing, subject, planType: "Free Demo" }
        API->>Chime: Create Meeting Session & Attendee Tokens
        Chime-->>API: Return Meeting ID & Join URL
        API->>DocDB: Save Booking (status: "confirmed", meetingLink)
        API->>SES: Dispatch Demo Confirmation Email to Student & Tutor
        API-->>UI: Demo Scheduled Successfully
    else Paid 1-on-1 Class or Multi-Week Pack
        UI->>API: POST /api/payments/create-order { amount, tutorId, walletUsed }
        API->>SecMgr: Fetch RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
        API->>RZP: razorpay.orders.create({ amount, currency: "INR" })
        RZP-->>API: Return order_id
        API-->>UI: Open Razorpay Checkout Modal
        Student->>UI: Completes payment in UI
        UI->>API: POST /api/payments/verify-payment { order_id, payment_id, signature }
        API->>API: Validate HMAC SHA256 Signature using KMS/Secrets
        API->>DocDB: Update Booking (status: "enrolled", amountPaid)
        API->>Chime: Initialize Recurring Meeting Rooms
        API->>SES: Dispatch Official Payment Invoice & Schedule to Student & Tutor
        API-->>UI: Payment Verified & Redirect to Dashboard
    end
```

---

### 4. Event-Driven Referral & Wallet Engine (EventBridge + DynamoDB)

```mermaid
flowchart TD
    A["🎓 Student Conducts Class (Status marked 'completed')"] --> B["API Publishes Event: ClassCompleted to Amazon EventBridge"]
    B --> C["EventBridge Rule: Match 'ClassCompleted' with referralCode"]
    C --> D["AWS Lambda: referral-wallet-processor"]
    D --> E["Query Amazon DocumentDB: Check referrer user ID"]
    E --> F{"Is First Completed Class for this Student?"}
    F -->|Yes| G["Credit +₹250 to Referrer's Wallet Balance"]
    G --> H["Record Transaction in walletHistory ledger"]
    H --> I["Amazon SES: Dispatch 'You Earned ₹250!' celebration email to Referrer"]
    F -->|No| J["Skip (Referral reward already credited)"]
```

---

### 5. Serverless Financial Payout Engine (AWS Step Functions + SES)

```mermaid
flowchart LR
    subgraph StepFunctions["AWS Step Functions (Monthly Payout Orchestrator)"]
        Start["Start Payout Calculation"]
        Query["Query DocumentDB for all completed sessions in month"]
        Split["Calculate 90% Tutor Net / 10% Platform Fee"]
        CheckBank{"Bank Details Configured?"}
        Log["Record Payout Ledger in DocumentDB"]
        Email["Trigger Amazon SES Receipt Email"]
        Reminder["Trigger Amazon SES Bank Reminder Email"]
    end

    Start --> Query --> Split --> CheckBank
    CheckBank -->|Yes| Log --> Email
    CheckBank -->|No| Reminder
```

---

## 🗄️ Database Architecture & AWS Data Model (DocumentDB / Aurora Serverless)

### Amazon DocumentDB 5.0 Cluster Setup
Amazon DocumentDB provides full BSON and MongoDB query API compatibility while offering enterprise reliability with automated storage autoscaling from 10 GB up to 128 TB.

```mermaid
erDiagram
    AWS_Cognito_User ||--o| User_Profile : "maps to sub (UUID)"
    User_Profile ||--o| Tutor_Profile : "extends if role = tutor"
    User_Profile ||--o{ Booking_Ledger : "books sessions as student"
    User_Profile ||--o{ Course_Payment : "purchases AI skills cohort"
    User_Profile ||--o{ Message_Store : "sends/receives messages"
    Tutor_Profile ||--o{ Booking_Ledger : "conducts tutoring classes"

    User_Profile {
        string cognitoSub PK "UUID from Amazon Cognito"
        string email UK
        string full_name
        string phone
        string role "admin | hr | student | tutor"
        string student_class
        string referralCode UK
        string referredBy FK
        number walletBalance "Default: 0"
        array walletHistory "type, amount, date, description"
        string s3AvatarKey "Amazon S3 Object Key"
        timestamp createdAt
    }

    Tutor_Profile {
        ObjectId _id PK
        string userId FK "References User_Profile.cognitoSub"
        string name
        string s3PhotoKey "Amazon S3 Key"
        string s3VerificationDocKey "Amazon S3 Key (Restricted IAM)"
        string category
        string mode "Online | Offline | Hybrid"
        string qualification
        number experience
        number rating
        number hourlyRate
        array subjectRates "subject, rate"
        array pricingHistory "subject, rate, effectiveFrom, effectiveTo"
        array availability "day, startTime, endTime"
        array demoSlots "date, time, available"
        object paymentDetails "bankName, accountNumber, ifscCode, upiId"
        array payoutHistory "amount, periodMonth, transactionRef, disbursedAt"
    }

    Booking_Ledger {
        ObjectId _id PK
        ObjectId tutorId FK
        string studentId FK
        string subject
        string timing
        string status "pending | confirmed | enrolled | completed | cancelled"
        string planType "Free Demo | Single Class | Multi Pack"
        number amountPaid
        string chimeMeetingId "Amazon Chime Meeting Identifier"
        string meetingJoinUrl "Amazon Chime / Google Meet URL"
        array sessions "date, time, meetingUrl, status"
        timestamp createdAt
    }

    Course_Payment {
        ObjectId _id PK
        string studentId FK
        string purchaseType "assessment | full_course"
        number amountPaid
        string razorpayOrderId
        string razorpayPaymentId
        boolean shortlisted
        number assessmentScore
        timestamp createdAt
    }

    Message_Store {
        ObjectId _id PK
        string senderId FK
        string receiverId FK
        string text
        boolean read
        timestamp createdAt
    }
```

---

## 💻 Complete AWS Technology Stack Inventory

### AWS Cloud Infrastructure & Services
| AWS Service | Category | Specification / Configuration | Function in Platform |
| :--- | :--- | :--- | :--- |
| **Amazon CloudFront** | CDN & Edge Network | Global Edge Locations, TLS 1.3, Brotli Compression | Global ultra-low latency delivery of React SPA |
| **Amazon S3** | Object Storage | S3 Standard with Origin Access Control (OAC) | Static web hosting & encrypted tutor verification docs |
| **AWS Route 53** | DNS & Traffic Routing | Alias Records, Health Checks, Latency Routing | Production DNS management for web and API subdomains |
| **AWS Certificate Manager (ACM)** | SSL / TLS Security | Automated 2048-bit RSA / ECDSA certificates | Free automated wildcard SSL renewal (`*.cuvasol.com`) |
| **AWS WAF** | Web Security & Firewall | Core Rule Set (CRS), Rate Limiting (2000 req/5min) | Layer 7 DDoS, SQL injection & XSS attack protection |
| **AWS App Runner** | Managed Containers | `1 vCPU, 2 GB RAM` (Autoscaling 1–10 instances) | Managed Node.js Express REST API compute |
| **Amazon DocumentDB** | Managed Database | MongoDB 5.0 compatible, 3-Node Multi-AZ Cluster | User profiles, bookings, ratings, and payout ledgers |
| **Amazon Cognito** | Identity & Access | User Pools + Google Federation + JWT Tokens | Multi-role user authentication, password resets & MFA |
| **Amazon Bedrock** | Generative AI LLM | Anthropic Claude 3.5 Sonnet / Amazon Titan Text | Conversational AI support & automated student assistance |
| **Amazon SES** | Email Service | Dedicated IP, SPF/DKIM configured, SNS Webhooks | High-deliverability OTPs, invoices & payout receipts |
| **Amazon Chime SDK** | Real-time Video | WebRTC HD Audio/Video, Screen Share, Recording | High-definition online 1-on-1 and group classrooms |
| **AWS EventBridge** | Event Bus & Scheduler | Default Bus + Scheduled Cron Rules | Decoupled referral wallet credits & monthly cron jobs |
| **AWS Secrets Manager** | Secrets & Encryption | Envelope Encryption with AWS KMS Customer Keys | Secure storage of Razorpay, Google & DB credentials |
| **Amazon CloudWatch** | Monitoring & Logging | Log Groups (30-day retention), Metric Alarms | Real-time API latency tracking, 5xx alarms, audit logs |
| **AWS X-Ray** | Distributed Tracing | SDK middleware sampling 5% of requests | Performance bottleneck profiling across API & database |
| **AWS CodePipeline** | CI/CD Automation | GitHub Source $\rightarrow$ CodeBuild $\rightarrow$ App Runner | Fully automated zero-downtime deployment on git push |

---

## 📁 AWS-Native Repository & Infrastructure as Code (IaC) Directory Structure

```text
teach-grow-guide/
├── README_AWS.md                   # AWS Enterprise Cloud Architecture Documentation
├── AWS_MIGRATION_GUIDE.md          # Step-by-step migration guide from Vercel to AWS
├── Brevo_DNS_Instructions.md       # DNS configuration for email delivery
├── package.json                    # Frontend project dependencies
├── vite.config.ts                  # Vite production build configuration
│
├── iac/                            # Infrastructure as Code (AWS CDK / Terraform)
│   ├── terraform/                  # Terraform AWS Infrastructure Modules
│   │   ├── main.tf                 # Core AWS provider and VPC definition
│   │   ├── s3_cloudfront.tf        # S3 static website bucket, OAC & CloudFront CDN
│   │   ├── app_runner.tf           # AWS App Runner service definition & autoscaling
│   │   ├── documentdb.tf           # Amazon DocumentDB multi-AZ cluster definition
│   │   ├── cognito.tf              # Cognito User Pool, Clients & Google Federation
│   │   ├── ses_email.tf            # SES domain identity, DKIM & SNS bounce topics
│   │   ├── waf_shield.tf           # AWS WAF web ACL rules and rate limiting
│   │   └── variables.tf            # Configurable environment variables and region
│   └── cdk/                        # AWS Cloud Development Kit (TypeScript)
│       ├── bin/app.ts              # CDK application entrypoint
│       └── lib/cuvasol-stack.ts    # Full-stack AWS architecture construct
│
├── backend/                        # Express.js REST API (AWS-Optimized)
│   ├── Dockerfile                  # Multi-stage optimized Node.js 20 container
│   ├── .dockerignore               # Container ignore rules
│   ├── index.js                    # Express app with AWS Secrets Manager & X-Ray init
│   ├── package.json                # Backend dependencies (including @aws-sdk clients)
│   ├── routes/                     # REST Route Controllers
│   │   ├── authRoutes.js           # Cognito integration & session validation
│   │   ├── tutorRoutes.js          # Tutor profiles, availability & Chime meetings
│   │   ├── dashboardRoutes.js      # Analytics, Student dashboard & HR payouts
│   │   ├── paymentRoutes.js        # Razorpay payments with Secrets Manager keys
│   │   ├── chatbotRoutes.js        # Amazon Bedrock Claude 3.5 Sonnet client
│   │   ├── messageRoutes.js        # In-app chat & real-time messaging
│   │   └── uploadRoutes.js         # S3 Presigned URL generator for secure uploads
│   ├── schemas/                    # Mongoose / DocumentDB Data Models
│   ├── utils/                      # AWS Service Clients
│   │   ├── awsSecrets.js           # AWS Secrets Manager dynamic credential fetcher
│   │   ├── s3Service.js            # Amazon S3 Presigned Put/Get URL generator
│   │   ├── sesEmailService.js      # Amazon SES email dispatcher using @aws-sdk/client-ses
│   │   ├── bedrockService.js       # Amazon Bedrock LLM client using @aws-sdk/client-bedrock-runtime
│   │   └── chimeMeetingService.js  # Amazon Chime SDK video room creator
│   └── scripts/                    # Database seeding and administrative tools
│
└── src/                            # React 18 + TypeScript Frontend SPA
    ├── App.tsx                     # React Router, AuthProvider & Network Alerts
    ├── config/api.ts               # AWS CloudFront / App Runner API endpoint resolver
    ├── components/                 # UI components, Leaflet maps, 23 dynamic themes
    └── pages/                      # Page views, dashboards, and assessment quiz
```

---

## 📡 Comprehensive AWS API & Service Architecture Reference

```text
                               ┌──────────────────────────────────────────────┐
                               │       AWS CloudFront (Edge Router)           │
                               │           https://tutor.cuvasol.com          │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                                                             │
         Path: /index.html, /assets/*                                          Path: /api/*
                       │                                                             │
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     Amazon S3 Bucket      │                                 │      AWS App Runner       │
         │   (Vite React SPA Build)  │                                 │ (Express REST API Server) │
         └───────────────────────────┘                                 └─────────────┬─────────────┘
                                                                                     │
         ┌───────────────────────────────────────────────────────────────────────────┼──────────────────────────────────┐
         ▼                                     ▼                                     ▼                                  ▼
┌──────────────────┐                 ┌──────────────────┐                  ┌──────────────────┐               ┌──────────────────┐
│  Amazon Cognito  │                 │ Amazon DocumentDB│                  │  Amazon Bedrock  │               │    Amazon SES    │
│ (Authentication) │                 │  (Data Cluster)  │                  │  (GenAI Support) │               │ (Email & Alerts) │
└──────────────────┘                 └──────────────────┘                  └──────────────────┘               └──────────────────┘
```

---

## 🔐 AWS Secrets Manager & Systems Manager Parameter Store Reference

In production, all sensitive credentials reside inside **AWS Secrets Manager** (`arn:aws:secretsmanager:ap-south-1:123456789012:secret:cuvasol/prod-secrets`):

```json
{
  "MONGO_URI": "mongodb://dbadmin:SecurePassword123@docdb-cluster.cluster-xxxx.ap-south-1.docdb.amazonaws.com:27017/teachgrow?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false",
  "JWT_SECRET": "c983fb08173618491028374619a8bc47e62d109f",
  "COGNITO_USER_POOL_ID": "ap-south-1_xxxxxxxxx",
  "COGNITO_CLIENT_ID": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "RAZORPAY_KEY_ID": "rzp_live_xxxxxxxxxxxxxx",
  "RAZORPAY_KEY_SECRET": "xxxxxxxxxxxxxxxxxxxxxxxx",
  "RAZORPAY_WEBHOOK_SECRET": "your_secure_webhook_secret",
  "AWS_BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "SES_EMAIL_FROM": "\"Cuvasol Tutor\" <support@cuvasol.com>",
  "S3_UPLOADS_BUCKET": "cuvasol-tutor-uploads-production"
}
```

---

## 🚀 Infrastructure Deployment Playbook (AWS CDK / Terraform / App Runner)

### Step 1: Automated Terraform Infrastructure Provisioning
```bash
# Navigate to Terraform directory
cd iac/terraform

# Initialize Terraform AWS providers
terraform init

# Review execution plan
terraform plan -out=tfplan

# Apply infrastructure to AWS (creates S3, CloudFront, Route53, DocumentDB, App Runner)
terraform apply tfplan
```

### Step 2: Build & Push Backend Container to Amazon ECR
```bash
# 1. Log in to Amazon Elastic Container Registry (ECR)
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

# 2. Build Docker container image
cd backend
docker build -t cuvasol-backend:latest .

# 3. Tag image for ECR repository
docker tag cuvasol-backend:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/cuvasol-backend:latest

# 4. Push image to Amazon ECR
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/cuvasol-backend:latest
```

### Step 3: Deploy Frontend SPA to Amazon S3 & Invalidate CloudFront
```bash
# Navigate to root directory
cd ../

# Install dependencies and build production assets
npm install
npm run build

# Sync build files to S3 bucket
aws s3 sync dist/ s3://cuvasol-frontend-production-bucket/ --delete

# Create CloudFront cache invalidation
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

---

## 🛡️ Observability, Monitoring & Security (CloudWatch, X-Ray, WAF & GuardDuty)

* **AWS WAF**: Blocks malicious SQL injections, cross-site scripting (XSS), and rate-limits aggressive scrapers to 2,000 requests per 5 minutes per IP.
* **Amazon CloudWatch Alarms**:
  - `AppRunner-5xx-Alarm`: Triggers SNS alert if HTTP 5xx errors exceed 1% over a 5-minute window.
  - `DocumentDB-CPU-High`: Alarms if cluster CPU utilization exceeds 80%.
  - `SES-Bounce-Rate-Alert`: Alarms if email bounce rate exceeds 5% to protect sender reputation.
* **AWS GuardDuty**: Continuous intelligent threat detection monitoring VPC flow logs and DNS query logs for unauthorized access.

---

## 💰 AWS High Availability, Disaster Recovery & Cost Optimization

### Estimated Monthly Operational Cost (India / ap-south-1 Region)
| Service | Tier / Spec | Estimated Monthly Cost |
| :--- | :--- | :--- |
| **Amazon S3 + CloudFront CDN** | Static SPA + 100 GB Bandwidth | **$1.50 – $3.00** |
| **AWS App Runner (API Compute)** | 1 vCPU, 2 GB (Active 24/7 with auto-scale to 0 on idle) | **$15.00 – $28.00** |
| **Amazon DocumentDB (db.t3.medium)**| 1 Instance (Dev/Staging) to 2-Node Multi-AZ (Prod) | **$30.00 – $75.00** |
| **Amazon Cognito** | Up to 50,000 Monthly Active Users (Free Tier) | **$0.00 (Free Tier)** |
| **Amazon SES** | 10,000 Transactional Emails / Month | **$1.00** |
| **AWS Route 53 & ACM** | Hosted Zone + Free SSL Certificates | **$0.50** |
| **AWS Secrets Manager & CloudWatch**| Secrets storage & 5 GB Log ingestion | **$1.50** |
| **Total Estimated Cost** | **High-Availability Production Cloud Setup** | **~$50.00 – $110.00 / month** |

---

## ❓ Troubleshooting & AWS Migration FAQ

<details>
<summary><strong>1. Can we keep our existing MongoDB database while migrating compute to AWS?</strong></summary>

**Yes.** You can continue hosting on **MongoDB Atlas** (using AWS ap-south-1 VPC Peering or PrivateLink) while running your frontend on **S3 + CloudFront** and your API on **AWS App Runner**. Migration to Amazon DocumentDB can be performed whenever desired using the **AWS Database Migration Service (AWS DMS)**.
</details>

<details>
<summary><strong>2. How does Amazon Cognito handle our custom Student, Tutor, Admin, and HR roles?</strong></summary>

Amazon Cognito User Pools support **Custom Attributes** (`custom:role` = `student | tutor | admin | hr`) or **Cognito User Groups** (`Students`, `Tutors`, `Admins`, `HR`). When a user authenticates, their issued JWT ID token includes their role group claim, which the backend middleware validates instantly.
</details>

<details>
<summary><strong>3. How does Amazon Bedrock compare to Google Gemini for the support chatbot?</strong></summary>

**Amazon Bedrock** provides private access to leading Foundation Models like **Anthropic Claude 3.5 Sonnet** and **Amazon Titan** directly within your AWS VPC. Your proprietary tutor information and student data are never used to train public models, guaranteeing complete enterprise data privacy and compliance.
</details>

---

## 📄 License & Cloud Governance

* **Platform**: Cuvasol Tutor / Teach Grow Guide (AWS Enterprise Architecture)
* **Cloud Infrastructure Provider**: Amazon Web Services (AWS)
* **Compliance Standards**: SOC 2 Type II, ISO 27001, GDPR & DPDP Ready
* **Technical Contact**: [support@cuvasol.com](mailto:support@cuvasol.com)
