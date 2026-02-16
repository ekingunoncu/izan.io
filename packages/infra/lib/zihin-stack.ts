import * as cdk from 'aws-cdk-lib'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as path from 'node:path'
import type { Construct } from 'constructs'

const DOMAIN = 'zihin.io'
const DOMAIN_NAMES = [DOMAIN, `www.${DOMAIN}`]

/** Root of the monorepo (packages/infra/../../) */
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..')

export class ZihinStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ─── S3 Bucket ──────────────────────────────────────────────────────
    const websiteBucket = new s3.Bucket(this, 'ZihinBucket', {
      bucketName: `zihin-web-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    })

    // ─── GitHub OAuth Token Exchange Lambda ─────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'ZihinApi', {
      apiName: 'zihin-api',
      description: 'zihin.io API',
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: [
          'http://localhost:3001',
          'http://127.0.0.1:3001',
          `https://${DOMAIN}`,
          `https://www.${DOMAIN}`,
        ],
        maxAge: cdk.Duration.hours(24),
      },
    })

    const authTokenFn = new lambda.Function(this, 'AuthTokenFn', {
      functionName: 'zihin-auth-token',
      runtime: lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      code: lambda.Code.fromInline(`
exports.handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET_GITHUB,
      code: body.code,
    }),
  });
  const data = await res.json();
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
      `.trim()),
      environment: {
        GITHUB_CLIENT_ID: process.env.VITE_GITHUB_CLIENT_ID || '',
        CLIENT_SECRET_GITHUB: process.env.CLIENT_SECRET_GITHUB || '',
      },
    })

    httpApi.addRoutes({
      path: '/api/auth/token',
      methods: [apigwv2.HttpMethod.POST],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        'AuthTokenIntegration',
        authTokenFn,
      ),
    })

    // ─── CloudFront Distribution ────────────────────────────────────────
    const oac = new cloudfront.S3OriginAccessControl(this, 'ZihinOAC', {
      signing: cloudfront.Signing.SIGV4_ALWAYS,
    })

    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket, {
      originAccessControl: oac,
    })

    const apiDomain = `${httpApi.httpApiId}.execute-api.${this.region}.amazonaws.com`
    const apiOrigin = new origins.HttpOrigin(apiDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    })

    const certArn = process.env.ZIHIN_DOMAIN_CERTIFICATE_ARN
    if (certArn) {
      const certRegion = certArn.split(':')[3]
      if (certRegion !== 'us-east-1') {
        throw new Error(
          `CloudFront requires ACM certificates in us-east-1. Your certificate is in ${certRegion}.`,
        )
      }
    }
    const certificate = certArn
      ? certificatemanager.Certificate.fromCertificateArn(
          this,
          'ZihinDomainCert',
          certArn,
        )
      : undefined

    // CloudFront Function: rewrite paths to index.html for SPA
    const indexRewriteFn = new cloudfront.Function(this, 'ZihinIndexRewriteFn', {
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
      comment: 'Rewrite path to index.html for zihin.io SPA routes',
    })

    const distribution = new cloudfront.Distribution(this, 'ZihinDistribution', {
      comment: 'zihin.io CDN',
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
      additionalBehaviors: {
        '/api/auth/token': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
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

    // ─── S3 Deployment ──────────────────────────────────────────────────
    new s3deploy.BucketDeployment(this, 'ZihinDeployment', {
      sources: [
        s3deploy.Source.asset(
          path.join(MONOREPO_ROOT, 'apps', 'zihin.io', 'build', 'client'),
        ),
      ],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    })

    // ─── Outputs ────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'ZihinCloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'zihin.io CloudFront distribution URL',
    })

    if (certificate) {
      new cdk.CfnOutput(this, 'ZihinDomainURL', {
        value: `https://${DOMAIN}`,
        description: 'Custom domain URL (zihin.io)',
      })
    }

    new cdk.CfnOutput(this, 'ZihinApiURL', {
      value: httpApi.url ?? '',
      description: 'zihin.io API Gateway URL',
    })
  }
}
