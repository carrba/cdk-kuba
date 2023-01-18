sudo su -

yum install httpd -y
sleep 180
TEXT=$(curl http://${Token[TOKEN.298]})
echo -e "$TEXT" > /var/www/html/priv.html
service httpd start
service httpd enable
