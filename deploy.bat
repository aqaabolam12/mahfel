@echo off
echo Copying files...
copy /y server.js D:\mahfel\mahfel\server.js
copy /y public\index.html D:\mahfel\mahfel\public\index.html
copy /y public\css\style.css D:\mahfel\mahfel\public\css\style.css
copy /y public\css\themes.css D:\mahfel\mahfel\public\css\themes.css
copy /y public\js\app.js D:\mahfel\mahfel\public\js\app.js
echo Files copied!
cd /d D:\mahfel\mahfel
git add .
git status
git commit -m "v39 layout fix"
git push
echo Done!
pause
