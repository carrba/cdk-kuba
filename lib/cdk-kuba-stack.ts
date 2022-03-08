import { Stack, StackProps, CfnOutput, aws_elasticloadbalancingv2_targets, aws_kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import * as path from 'path';
import { KeyPair } from 'cdk-ec2-key-pair';
import { Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam'
import {readFileSync} from 'fs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export interface myStackProps extends StackProps {
  vpcid: string;
  subnetid: string;
}

export class CdkKubaStack extends Stack {
  constructor(scope: Construct, id: string, props: myStackProps) {
    super(scope, id, props);

    // vpc and subnet
    let myvpc: ec2.IVpc;
    if (props.vpcid) {
      myvpc = ec2.Vpc.fromLookup(this, "VPC", {
        vpcId: props.vpcid,
        isDefault: false
      });
    }
    else {
      myvpc = new ec2.Vpc(this, 'vpc', {
        vpcName: "CDK Practice Test",
        cidr: "172.30.0.0/16",
        natGateways: 0,
        maxAzs: 1,
        subnetConfiguration: [
          {
            name: 'public-subnet-1',
            subnetType: ec2.SubnetType.PUBLIC,
            cidrMask: 24,        
          },
          {
            name: 'private-subnet-1',
            subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            cidrMask: 24,
          }
        ]
      });
    }

    // ec2 security group
    const webSG = new ec2.SecurityGroup(this, 'cdk-web-sg', {
      securityGroupName: 'cdk-web-sg',
      vpc: myvpc,
      allowAllOutbound: true,
    });

    webSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow incoming HTTP'
    );

    webSG.addIngressRule(
      ec2.Peer.ipv4('77.100.137.249/32'),
      ec2.Port.tcp(22),
      'allow incoming SSH'
    );

    // key pair
    const keypair = new KeyPair (this, 'ec2-key', {
      name: 'ec2-keypair',
      publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDECJsrrE4X19WGkg9VH4Z2LKaBfxTsKMRqq2wjDLqH15HRetG3DtDabWLXhJ+9gge5ImTftvyjOzgpx/CLCqTK72CrAN7TQIUZs8Dx/EJEIz8/+f8DWPwJ/VgbUj0of5ff3Q6eyDbV3Arhrar5uUbpvYnkQxouRIlLCk0MG9Z0qud+2zPZmrvtOnsKI1fdc53o68GYr1/ZiNmpH2JUsFBC4UOPou2s9uQlFzULOfksRbqQtivtvxhdokkKR2PoMvpTRhg9sdy5FoBxAZ13ZmGQRAJRsemBm0oKl7eSajxuxT3AQXkKAVkvQkue5Xz+2zEYVy1F5aqyStq17g4pPAtp5PuM2bUxoNrgMwQXjtfwfv2V+b5/RqwsQYPHiu0RH5qqbF8FVaKPP3AEVj4TIyOukcVSbwRDAawjvJe8Vl5JSnYlMATqXXE/UEVRt6oFP4yYZDf/nCPLAjkLHya6hlNpYDbtv8LThmKyOVfT4xdEjfvO5XzpOV4UTRqV9hqUINs= bcarr@Dell-Lat',
    })
    /*
    // ec2 role
    const role = new iam.Role(this, 'ec2Role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    })

    role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'))
    */
    // ec2 public instance
    const ec2public = new ec2.Instance(this, 'ec2-public', {
      vpc: myvpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC},
      securityGroup: webSG,
      keyName: keypair.keyPairName,
      // role: role,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });

    const ec2pip = new ec2.CfnEIP(this, "PIP")

    const ec2pipassoc = new ec2.CfnEIPAssociation(this, "EIPAssoc", {
      eip: ec2pip.ref,
      instanceId: ec2public.instanceId
    })
    /*
    // ec2 instance asset
    const asset = new Asset(this, 'Asset', { path: path.join(__dirname, '../src/config.sh') });
    const localpath = ec2public.userData.addS3DownloadCommand ({
      bucket: asset.bucket,
      bucketKey: asset.s3ObjectKey,
    })
    asset.grantRead(ec2public.role);
    ec2public.userData.addExecuteFileCommand({
      filePath: localpath,
      arguments: '--verbose -y'
    });
    */
    const userDataScript = readFileSync('./src/config.sh', 'utf8');

    // 👇 add user data to the EC2 instance
    ec2public.addUserData(userDataScript)

    const myvpcOutput = new CfnOutput(this, "VPC-is", {
      value:  myvpc.vpcId
    });
    const myec2ipOutput = new CfnOutput(this, "IP", {
      value:  ec2public.instancePublicIp
    });
  }
}
