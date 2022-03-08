sudo su -

yum install httpd -y
sleep 180
TEXT=$(curl http://${Token[TOKEN.297]})
echo -e "$TEXT" > /var/www/html/priv.html
service httpd start
service httpd enable
