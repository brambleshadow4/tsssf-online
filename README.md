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

###  One time setup

	git clone <link-to-repo>
	cd <repo-folder>
	npm install 
	npm run tsc
	cd ./img
	py generateThumbnails.py

Note that the card thumbnails are not stored in the repository. Rather, 
they are generated programmatically using a python script.

### Running the server

	node server/server.js

If instead you'd like to run the severver on port 8000, use

	node server/server.js dev


### Adding HTTPS ###

To run the web server over SSL, create a settings.txt file in the server
directory with the following items set:

	CERT=path/to/server.crt
	KEY=path/to/private.key
	PASSPHRASE=password
