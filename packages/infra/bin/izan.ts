#!/usr/bin/env node
/**
 * @izan/infra - CDK App Entry Point
 *
 * Deploys the full izan.io stack:
 *   - S3 + CloudFront (web app)
 *   - HTTP API Gateway + Lambda (MCP server)
 */

import * as cdk from 'aws-cdk-lib'
import { IzanStack } from '../lib/izan-stack'

const app = new cdk.App()

new IzanStack(app, 'IzanStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-1',
  },
  description: 'izan.io - AI Agent Platform',
})
