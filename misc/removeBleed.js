import sharp from "sharp";
import fs from "fs";
let [_, file, infile, outfile] = process.argv;


// Bleed files are 889 x 1214
// cropped files are 788 x 1088

if(!infile || !outfile)
{
	console.log("Usage: node removeBleed.js inputFolder outputFolder")
	console.log("  Removes the bleed from every .png image in inputFolder and puts the new image in outputFolder");
	process.exit();
}

// create out folder if it doesn't exist.

if(!fs.existsSync(outfile))
{
	fs.mkdirSync(outfile);
}


let files = fs.readdirSync(infile);

let foundFiles = false;

for(let f of files)
{
	if(f.endsWith(".png"))
	{
		let infileFull = infile + "/" + f;
		let outfileFull = outfile + "/" + f;

		foundFiles = true;
		console.log("Converting " + f);
		sharp(infileFull).extract({left: 51, top: 63, width: 788, height: 1088}).toFile(outfileFull, function(e)
		{
			if(e)
			{
				console.error("Error converting " + f);
				console.error(e);
			}
		});
	}
}
if(!foundFiles)
{
	console.log("No .png files were found which could be converted");
}
