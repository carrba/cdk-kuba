sudo su -

yum install httpd -y
ID=$(curl http://169.254.169.254/latest/meta-data/instance-id)
IP=$(curl http://169.254.169.254/latest/meta-data/public-ipv4)
IIP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
echo -e "$ID\n\n$IP\n\n$IIP" > /var/www/html/index.html

service httpd start
service httpd enable