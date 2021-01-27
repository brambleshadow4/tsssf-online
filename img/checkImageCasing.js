import fs from "fs";
import path from "path";
import cards from "../server/cards.js";


const getAllFiles = function(dirPath, ) {
	var files = fs.readdirSync(dirPath)
	var arrayOfFiles = [];
	files.forEach(function(file) 
	{
		if (fs.statSync(dirPath + "/" + file).isDirectory()) 
		{
			arrayOfFiles = arrayOfFiles.concat(getAllFiles(dirPath + "/" + file, arrayOfFiles))
	    } 
	    else 
	    {
			arrayOfFiles.push(path.join(dirPath + "/" + file))
	    }
	})

	return arrayOfFiles
}


var allFiles = getAllFiles("./", []);

allFiles = new Set(allFiles.filter(x => x.endsWith('.png')).map(x => x.substring(x.lastIndexOf("\\")+1)));

console.log(allFiles);


for(var i in cards)
{
	var card = cards[i];

	if(!allFiles.has(card.url))
	{
		console.log("No exact match for card " + card.url);
	}
}