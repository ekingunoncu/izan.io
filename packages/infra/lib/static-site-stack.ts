import * as cdk from 'aws-cdk-lib'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import { Construct } from 'constructs'

export interface StaticSiteStackProps extends cdk.StackProps {
  /** Domain name (e.g. "izan.io") */
  domainName: string
  /** Path to the built static files */
  buildOutputPath: string
  /** ACM certificate ARN in us-east-1 for CloudFront */
  certificateArn?: string
  /** Additional domain names (e.g. "www.izan.io") */
  alternateNames?: string[]
}

export class StaticSiteStack extends cdk.Stack {
  public readonly bucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props)

    // S3 bucket for static files
    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: props.domainName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
    })

    // CloudFront distribution
    const domainNames = [props.domainName, ...(props.alternateNames ?? [])]
    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'Cert', props.certificateArn)
      : undefined

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
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
      ...(certificate ? { domainNames, certificate } : {}),
    })

    // Deploy static files to S3 + invalidate CloudFront
    new s3deploy.BucketDeployment(this, 'Deploy', {
      sources: [s3deploy.Source.asset(props.buildOutputPath)],
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    })

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', { value: this.bucket.bucketName })
    new cdk.CfnOutput(this, 'DistributionId', { value: this.distribution.distributionId })
    new cdk.CfnOutput(this, 'DistributionDomain', { value: this.distribution.distributionDomainName })
    new cdk.CfnOutput(this, 'URL', { value: `https://${props.domainName}` })
  }
}
