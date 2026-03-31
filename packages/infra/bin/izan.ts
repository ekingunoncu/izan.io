#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import { StaticSiteStack } from '../lib/static-site-stack'
import { resolve } from 'path'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-central-1',
}

new StaticSiteStack(app, 'IzanStack', {
  env,
  domainName: 'izan.io',
  alternateNames: ['www.izan.io'],
  buildOutputPath: resolve(__dirname, '../../../apps/web/build/client'),
  certificateArn: process.env.IZAN_DOMAIN_CERTIFICATE_ARN,
})

new StaticSiteStack(app, 'ZihinStack', {
  env,
  domainName: 'zihin.io',
  alternateNames: ['www.zihin.io'],
  buildOutputPath: resolve(__dirname, '../../../apps/zihin.io/build/client'),
  certificateArn: process.env.ZIHIN_DOMAIN_CERTIFICATE_ARN,
})
