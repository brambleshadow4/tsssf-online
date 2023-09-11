Twilight Sparkle's Secret Shipfic Folder: ONLINE
=======================================

Miss going to MLP conventions in person? Miss playing secret shipfic with
your friends IRL? Well, now you can do it online in your web browser.

[http://tsssf.net](http://tsssf.net)

About the game
-----------------
TSSSF is an MLP:FiM inspired card game made by Horrible People Games. 
Make sure to check out their [website](http://www.secretshipfic.com) and
[GitHub](https://github.com/HorriblePeople). Their assets are used as a part of
this project in accoradance to their share-alike [license](https://github.com/HorriblePeople/Core-Deck/blob/master/License.txt)


Running from source
-------------------------

Prerequisites: Familiarity with node/npm.

###  One time setup ###

	git clone <link-to-repo>
	cd <repo-folder>
	npm install 
	npm run tsc
	npm run build
	npm run tsc

npm run build performs several operations outlined below. It will need to be rerun if the source files are updated

* Generates .thumb.png files
* Creates .ts files from corresponding config files
   * faq.ts


### Running the server ###

	node server/server.js

If instead you'd like to run the severver on port 8000, use

	node server/server.js dev


### Adding HTTPS ###

To run the web server over SSL, create a .env file in the project
directory with the following items set:

	PORT 443

	CERT=path/to/server.crt
	KEY=path/to/private.key
	PASSPHRASE=password

### Unit Tests ###

The unit tests can all at the same time, or individually by specifying the number

	npm run test
	npm run test 10

### NGINX ###

The tsssf-online server runs on a single port and is intended to be used with an NGINX proxy server which handles
HTTP -> HTTPS upgrades. This also allows you host the website on on its own port alongside other servers or web services.

A sample config is below.

	events {}
	http {
	    keepalive_timeout  65;
	    map $http_upgrade $connection_upgrade {
	        default upgrade;
	        '' close;
	    }
        
	    server {
	        listen 80;
	        server_name  tsssf.net;
	        return 301 https://$host$request_uri;
	    }
	    
	    server {
	        listen 443 ssl;
	        server_name  tsssf.net;
	 
	        ssl_certificate <path-to-certificate>;
	        ssl_certificate_key <path-to-key>;
	 
	        location / {
	            proxy_pass https://127.0.0.1:8000;
	 
	            # Setup for websockets
	            proxy_http_version 1.1;
	            proxy_set_header Upgrade $http_upgrade;
	            proxy_set_header Connection $connection_upgrade;
	 
	            proxy_connect_timeout 7d;
	            proxy_send_timeout 7d;
	            proxy_read_timeout 7d;
	        }
	    }
	}


