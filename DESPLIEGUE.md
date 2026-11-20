sudo git pull
npm run build
sudo rm -rf /var/www/html/permutas-frontend/*
sudo cp -r dist/* /var/www/html/permutas-frontend/
sudo restorecon -Rv /var/www/html/permutas-frontend
sudo systemctl restart httpd