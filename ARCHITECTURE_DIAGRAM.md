# Interview King Architecture Diagram

This diagram reflects the implemented runtime flow in the current repository.

## System Flow (Current)

```mermaid
flowchart LR
  %% Client and edge
  U[User Browser] --> N[Next.js App]
  N --> BFF[Next API Proxy /api/*]
  BFF --> APIGW[API Gateway]
  APIGW --> P[Primary Backend Lambda]

  %% Core data store
  P <--> DB[(PostgreSQL / RDS)]

  %% Manual scan trigger path
  P -->|POST /gmail/scan| INVOKE[Async Lambda Invoke]
  INVOKE --> S1[Scanner Lambda - Trigger Stage]

  %% Scanner message discovery
  S1 --> G[Gmail API]
  S1 -->|Enqueue work items| SQS_SCAN[(SQS - Scanner Results Queue)]

  %% Scanner processor stage
  SQS_SCAN --> S2[Scanner Lambda - SQS Processor Stage]
  S2 --> G
  S2 --> AI{AI Classifier Enabled?}
  AI -->|Yes| OAI[OpenAI or HTTP Classifier Endpoint]
  AI -->|No| RULES[Rule/Heuristic Match Path]

  %% Persist detections/events through backend internal API
  OAI --> S2
  RULES --> S2
  S2 -->|HMAC-signed internal call| INT_EMAIL[/POST /internal/email-events/]
  INT_EMAIL --> P

  %% Notification creation and delivery pipeline
  P -->|Create notifications + enqueue jobs| SQS_NOTIF[(SQS - Notification Queue)]
  SQS_NOTIF --> W[Notification Worker Lambda]
  W -->|HMAC-signed internal calls| INT_NOTIF[/internal/notifications/claim\n/internal/notifications/mark-sent\n/internal/notifications/mark-failed/]
  INT_NOTIF --> P

  %% Delivery channels
  W --> SES[SES Email]
  W --> INAPP[In-app Delivery Marker]

  %% Security boundary notes
  classDef boundary fill:#eef6ff,stroke:#2b6cb0,stroke-width:1px,color:#1a365d;
  class INT_EMAIL,INT_NOTIF boundary;
```

## Trust + Auth Boundaries

```mermaid
flowchart TB
  subgraph Public
    U[Browser Client]
    N[Next.js Frontend]
  end

  subgraph AppEdge
    BFF[Next API Proxy]
    APIGW[API Gateway]
  end

  subgraph Backend
    P[Primary Backend Lambda]
    DB[(PostgreSQL)]
  end

  subgraph InternalWorkers
    S[Scanner Lambda]
    W[Notification Worker Lambda]
  end

  U -->|Cognito JWT| N
  N -->|Authorization header forwarded| BFF
  BFF --> APIGW --> P
  P --> DB

  S -->|X-Internal-HMAC*| P
  W -->|X-Internal-HMAC*| P
```

## Quick Notes

- Scanner pipeline is two-stage: trigger stage and SQS processor stage.
- Notification queue is consumed by Notification Worker, not by Primary Backend as the delivery engine.
- Primary Backend remains source of truth for notification state.
- AI classification is optional and controlled by environment flags.
