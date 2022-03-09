import { Stack, StackProps, CfnOutput, aws_elasticloadbalancingv2_targets, aws_kms } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { KeyPair } from 'cdk-ec2-key-pair';
import {readFileSync, writeFileSync} from 'fs';

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
        //isDefault: false
      });
    }
    /*
    else if (props.subnetid) {
      const mysubnet = ec2.Subnet.fromSubnetId(this, "subnet", props.subnetid);
        myvpcid = mysubnet.subnetVpcId,
      })
      myvpc = ec2.Vpc.fromLookup(this, "VPC", {
        vpcId: myvpcid,
        //isDefault: false
      });
    }
    */
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
        ]
      });
    }

    // ec2 web security group
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

    // ec2 no web security group
    const nowebSG = new ec2.SecurityGroup(this, 'cdk-noweb-sg', {
      securityGroupName: 'cdk-noweb-sg',
      vpc: myvpc,
      allowAllOutbound: true,
    });

    nowebSG.addIngressRule(
      ec2.Peer.ipv4('77.100.137.249/32'),
      ec2.Port.tcp(22),
      'allow incoming SSH'
    );
    
    nowebSG.addIngressRule(
      ec2.Peer.ipv4('10.0.0.0/8'),
      ec2.Port.tcp(80),
      'allow 10.0.0.0/8 IP incoming HTTP'
    );

    nowebSG.addIngressRule(
      ec2.Peer.ipv4('172.16.0.0/12'),
      ec2.Port.tcp(80),
      'allow 172.16.0.0/12 IP incoming HTTP'
    );

    nowebSG.addIngressRule(
      ec2.Peer.ipv4('192.168.0.0/16'),
      ec2.Port.tcp(80),
      'allow 192.168.0.0/16 IP incoming HTTP'
    );

    // key pair
    const keypair = new KeyPair (this, 'ec2-key', {
      name: 'ec2-keypair',
      publicKey: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDECJsrrE4X19WGkg9VH4Z2LKaBfxTsKMRqq2wjDLqH15HRetG3DtDabWLXhJ+9gge5ImTftvyjOzgpx/CLCqTK72CrAN7TQIUZs8Dx/EJEIz8/+f8DWPwJ/VgbUj0of5ff3Q6eyDbV3Arhrar5uUbpvYnkQxouRIlLCk0MG9Z0qud+2zPZmrvtOnsKI1fdc53o68GYr1/ZiNmpH2JUsFBC4UOPou2s9uQlFzULOfksRbqQtivtvxhdokkKR2PoMvpTRhg9sdy5FoBxAZ13ZmGQRAJRsemBm0oKl7eSajxuxT3AQXkKAVkvQkue5Xz+2zEYVy1F5aqyStq17g4pPAtp5PuM2bUxoNrgMwQXjtfwfv2V+b5/RqwsQYPHiu0RH5qqbF8FVaKPP3AEVj4TIyOukcVSbwRDAawjvJe8Vl5JSnYlMATqXXE/UEVRt6oFP4yYZDf/nCPLAjkLHya6hlNpYDbtv8LThmKyOVfT4xdEjfvO5XzpOV4UTRqV9hqUINs= bcarr@Dell-Lat',
    })

    // ec2 box1 instance
    const ec2box1 = new ec2.Instance(this, 'ec2-box1', {
      vpc: myvpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC},
      securityGroup: nowebSG,
      keyName: keypair.keyPairName,
      instanceName: "cdkkubabox1",
      // role: role,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });

    // ec2 box2 instance
    const ec2box2 = new ec2.Instance(this, 'ec2-box2', {
      vpc: myvpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC},
      securityGroup: webSG,
      keyName: keypair.keyPairName,
      instanceName: "cdkkubabox2",
      // role: role,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T2,
        ec2.InstanceSize.MICRO
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux(),
    });

    let data = "sudo su -\n\nyum install httpd -y\nsleep 180\nTEXT=$(curl http://" + ec2box1.instancePrivateIp .trim() + ")\n"
    + "echo -e \"$TEXT\" > /var/www/html/priv.html\nservice httpd start\nservice httpd enable\n";

    const userDataScript = readFileSync('./src/config.sh', 'utf8');
    
    writeFileSync('./src/priv2.sh', data);
    const userDataScriptpriv = readFileSync('./src/priv2.sh', 'utf8');

    // 👇 add user data to the EC2 instance
    ec2box1.addUserData(userDataScript);
    ec2box2.addUserData(userDataScriptpriv);

    const myvpcOutput = new CfnOutput(this, "VPC-id", {
      value:  myvpc.vpcId,
      description: 'VPC-ID'
    });
    const myec2ipOutput = new CfnOutput(this, "IP", {
      value:  ec2box2.instancePublicIp,
      description: 'Box 2 Public IP address'
    });
    const myec2iipOutput = new CfnOutput(this, "iIP", {
      value:  ec2box1.instancePrivateIp,
      description: 'Box 1 private IP address'
    });
  }
}
