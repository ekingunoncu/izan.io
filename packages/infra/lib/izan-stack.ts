import * as cdk from 'aws-cdk-lib'
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as lambdaNode from 'aws-cdk-lib/aws-lambda-nodejs'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2'
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations'
import * as path from 'node:path'
import type { Construct } from 'constructs'
import { discoverMcpServers } from './discover-mcp-servers'

const DOMAIN = 'izan.io'
const DOMAIN_NAMES = [DOMAIN, `www.${DOMAIN}`]

/** Root of the monorepo (packages/infra/../../) */
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const MCP_SERVERS_ROOT = path.join(MONOREPO_ROOT, 'packages', 'mcp-servers')

export class IzanStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // ─── VPC + NAT Instance (fixed IP for Namecheap API) ──────────────────
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,
      natGateways: 0,
    })

    const natSecurityGroup = new ec2.SecurityGroup(this, 'NatSg', {
      vpc,
      description: 'NAT instance - allow from VPC, outbound to internet',
      allowAllOutbound: true,
    })
    natSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.allTraffic(),
      'Allow from VPC',
    )

    const natUserData = ec2.UserData.forLinux()
    natUserData.addCommands(
      'echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf',
      'sysctl -p',
      'for i in 1 2 3 4 5 6 7 8 9 10; do ip route | grep -q default && break; sleep 2; done',
      'iptables -P FORWARD ACCEPT',
      'iptables -A FORWARD -j ACCEPT',
      'IF=$(ip route | grep default | awk \'{print $5}\' | head -1)',
      '[ -n "$IF" ] && iptables -t nat -A POSTROUTING -o "$IF" -j MASQUERADE || iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE',
    )

    const natInstance = new ec2.Instance(this, 'NatInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
      machineImage: ec2.MachineImage.latestAmazonLinux2({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroup: natSecurityGroup,
      userData: natUserData,
      ssmSessionPermissions: true,
    })
    const cfnNat = natInstance.node.defaultChild as ec2.CfnInstance
    cfnNat.sourceDestCheck = false

    const natEip = new ec2.CfnEIP(this, 'NatEip', {
      domain: 'vpc',
      instanceId: natInstance.instanceId,
    })

    const isolatedSubnets = vpc.isolatedSubnets
    if (isolatedSubnets.length > 0) {
      const isolatedSubnet = isolatedSubnets[0] as ec2.PrivateSubnet
      isolatedSubnet.addRoute('NatRoute', {
        routerType: ec2.RouterType.INSTANCE,
        routerId: natInstance.instanceId,
        destinationCidrBlock: '0.0.0.0/0',
      })
    }

    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSg', {
      vpc,
      description: 'Lambda in VPC - outbound to internet',
      allowAllOutbound: true,
    })

    // ─── S3 Bucket ──────────────────────────────────────────────────────
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `izan-web-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    })

    // ─── MCP Server Lambdas (convention-based discovery) ────────────────
    const serverIds = discoverMcpServers()
    const mcpLambdas: Record<string, lambdaNode.NodejsFunction> = {}

    for (const serverId of serverIds) {
      const logGroup = new logs.LogGroup(this, `Mcp${pascal(serverId)}Logs`, {
        logGroupName: `/aws/lambda/izan-mcp-${serverId}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      })

      const serverEnv: Record<string, string> = {}

      if (serverId === 'namecheap') {
        const user = process.env.NAMECHEAP_API_USER
        const key = process.env.NAMECHEAP_API_KEY
        const clientIp = process.env.NAMECHEAP_CLIENT_IP ?? natEip.attrPublicIp
        const url = process.env.NAMECHEAP_API_URL
        if (user) serverEnv.NAMECHEAP_API_USER = user
        if (key) serverEnv.NAMECHEAP_API_KEY = key
        if (clientIp) serverEnv.NAMECHEAP_CLIENT_IP = clientIp
        if (url) serverEnv.NAMECHEAP_API_URL = url
      }

      const fnProps: lambdaNode.NodejsFunctionProps = {
        functionName: `izan-mcp-${serverId}`,
        entry: path.join(MCP_SERVERS_ROOT, serverId, 'src', 'index.ts'),
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_20_X,
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(30),
        memorySize: 256,
        logGroup,
        environment: Object.keys(serverEnv).length > 0 ? serverEnv : undefined,
        vpc: serverId === 'namecheap' ? vpc : undefined,
        vpcSubnets:
          serverId === 'namecheap'
            ? { subnets: vpc.isolatedSubnets }
            : undefined,
        securityGroups:
          serverId === 'namecheap' ? [lambdaSg] : undefined,
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
      }

      const fn = new lambdaNode.NodejsFunction(this, `Mcp${pascal(serverId)}Fn`, fnProps)

      mcpLambdas[serverId] = fn
    }

    // ─── HTTP API Gateway ───────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      apiName: 'izan-api',
      description: 'izan.io API - MCP servers',
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

    // POST /api/{serverId}/mcp → respective Lambda (convention: mcp-servers/{serverId}/mcp)
    for (const serverId of serverIds) {
      const fn = mcpLambdas[serverId]
      if (!fn) continue

      httpApi.addRoutes({
        path: `/api/${serverId}/mcp`,
        methods: [apigwv2.HttpMethod.POST],
        integration: new apigwv2Integrations.HttpLambdaIntegration(
          `Mcp${pascal(serverId)}Integration`,
          fn,
        ),
      })
    }

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
    for (const serverId of serverIds) {
      mcpBehaviors[`/api/${serverId}/mcp`] = {
        origin: apiOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        originRequestPolicy:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      }
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

    // ─── S3 Deployment ──────────────────────────────────────────────────
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

    new cdk.CfnOutput(this, 'McpServerIds', {
      value: serverIds.join(', '),
      description: 'Discovered MCP server IDs',
    })

    new cdk.CfnOutput(this, 'McpBaseUrl', {
      value: `https://${distribution.distributionDomainName}/api`,
      description: 'MCP base URL for client VITE_MCP_BASE_URL (same-origin; /api works without setting)',
    })

    new cdk.CfnOutput(this, 'NamecheapNATIp', {
      value: natEip.attrPublicIp,
      description: 'NAT Elastic IP - whitelist this in Namecheap Profile > Tools > API Access',
    })
  }
}

function pascal(s: string): string {
  return s
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}
