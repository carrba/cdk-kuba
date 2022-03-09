#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkKubaStack } from '../lib/cdk-kuba-stack';

const app = new cdk.App();
const vpcid = app.node.tryGetContext("vpc-id");
const subnetid = app.node.tryGetContext("subnet-id");

// create stack props object
const props = {
  env: {
    account: '211079746874',
    region: 'eu-west-1'
  },
  vpcid: vpcid,
  subnetid: subnetid,
};

// create stack
new CdkKubaStack(app, 'CdkKubaStack', props);