import * as cdk from 'aws-cdk-lib'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as path from 'node:path'
import type { Construct } from 'constructs'

const DOMAIN = 'izan.io'
const DOMAIN_NAMES = [DOMAIN, `www.${DOMAIN}`]

/** Root of the monorepo (packages/infra/../../) */
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..')

export class IzanStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ─── S3 Bucket ──────────────────────────────────────────────────────
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `izan-web-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    })

    // ─── HTTP API Gateway ───────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'izan-api',
      description: 'izan.io API',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://localhost:5175',
          'http://localhost:8080',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
          'http://127.0.0.1:5175',
          'https://izan.io',
          'https://www.izan.io',
        ],
        maxAge: cdk.Duration.hours(24),
      },
    })

    // POST /api/proxy/mcp → proxy to external MCP servers (target from X-MCP-Proxy-Target header)
    const proxyMcpFn = new lambdaNode.NodejsFunction(this, 'ProxyMcpFn', {
      functionName: 'izan-proxy-mcp',
      entry: path.join(MONOREPO_ROOT, 'packages', 'proxy-mcp-server', 'src', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: false,
        target: 'node20',
        format: lambdaNode.OutputFormat.ESM,
        mainFields: ['module', 'main'],
        banner:
          "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
        externalModules: [],
      },
    })
    httpApi.addRoutes({
      path: '/api/proxy/mcp',
      methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        'ProxyMcpIntegration',
        proxyMcpFn,
      ),
    })

    // GET /api/github-stars → proxy for GitHub API (avoids client rate limits)
    const githubStarsFn = new lambdaNode.NodejsFunction(this, 'GitHubStarsFn', {
      functionName: 'izan-github-stars',
      entry: path.join(MONOREPO_ROOT, 'packages', 'infra', 'handlers', 'github-stars.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    })
    httpApi.addRoutes({
      path: '/api/github-stars',
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        'GitHubStarsIntegration',
        githubStarsFn,
      ),
    })

    // ─── CloudFront Distribution ────────────────────────────────────────

    // Origin Access Control for S3
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    })

    // S3 origin (default - web app)
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket, {
      originAccessControl: oac,
    })

    // API Gateway origin (for /api/*)
    const apiDomain = `${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`
    const apiOrigin = new origins.HttpOrigin(apiDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    })

    const mcpBehaviors: Record<string, cloudfront.BehaviorOptions> = {}
    mcpBehaviors['/api/proxy/mcp'] = {
      origin: apiOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    }
    // GitHub stars: no cache (fresh count on every page load)
    mcpBehaviors['/api/github-stars'] = {
      origin: apiOrigin,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    }

    const certArn = process.env.IZAN_DOMAIN_CERTIFICATE_ARN
    if (certArn) {
      const certRegion = certArn.split(':')[3]
      if (certRegion !== 'us-east-1') {
        throw new Error(
          `CloudFront requires ACM certificates in us-east-1. Your certificate is in ${certRegion}. ` +
            `Create a new certificate in AWS Console → Certificate Manager (switch to us-east-1 region) for izan.io and www.izan.io, then set IZAN_DOMAIN_CERTIFICATE_ARN to that ARN.`,
        )
      }
    }
    const certificate = certArn
      ? certificatemanager.Certificate.fromCertificateArn(
          this,
          'DomainCert',
          certArn,
        )
      : undefined

    // CloudFront Function: rewrite /path to /path/index.html so S3 serves prerendered HTML
    // (S3 REST API has no "directory index" - /tr/agents/domain-expert must become
    //  tr/agents/domain-expert/index.html where the prerendered file lives)
    const indexRewriteFn = new cloudfront.Function(this, 'IndexRewriteFn', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
      `.trim()),
      comment: 'Rewrite path to index.html for React Router prerendered routes',
    })

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      comment: 'izan.io CDN',
      domainNames: certificate ? DOMAIN_NAMES : undefined,
      certificate,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        functionAssociations: [
          {
            function: indexRewriteFn,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: mcpBehaviors,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/__spa-fallback.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/__spa-fallback.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    })

    // DNS (izan.io, www.izan.io) is managed manually - not by this stack

    // ─── S3 Deployment (Web App) ───────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'WebsiteDeployment', {
      sources: [
        s3deploy.Source.asset(
          path.join(MONOREPO_ROOT, 'apps', 'web', 'build', 'client'),
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    })

    // ─── Outputs ────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    })

    if (certificate) {
      new cdk.CfnOutput(this, 'DomainURL', {
        value: `https://${DOMAIN}`,
        description: 'Custom domain URL (izan.io)',
      })
    }

    new cdk.CfnOutput(this, 'ApiGatewayURL', {
      value: httpApi.url ?? '',
      description: 'HTTP API Gateway URL',
    })

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for web assets',
    })
  }
}
