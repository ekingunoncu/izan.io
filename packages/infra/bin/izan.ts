#!/usr/bin/env node
/**
 * @izan/infra - CDK App Entry Point
 *
 * Deploys two stacks:
 *   - IzanStack: izan.io (S3 + CloudFront + API Gateway + Lambda)
 *   - ZihinStack: zihin.io agent marketplace (S3 + CloudFront + OAuth Lambda)
 */

import * as cdk from 'aws-cdk-lib'
import { IzanStack } from '../lib/izan-stack'
import { ZihinStack } from '../lib/zihin-stack'

const app = new cdk.App()

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
}

new IzanStack(app, 'IzanStack', {
  env,
  description: 'izan.io - AI Agent Platform',
})

new ZihinStack(app, 'ZihinStack', {
  env,
  description: 'zihin.io - Agent Marketplace',
})
