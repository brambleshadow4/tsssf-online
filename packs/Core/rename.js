import fs from "fs"


let pack = JSON.parse(fs.readFileSync("./pack.json"))

let mappings = []



fs.readdir("./Goal", function (err, files) {
	//handling error
	if (err) {
		return console.log('Unable to scan directory: ' + err);
	} 

	let goalNames = Object.keys(pack.cards.goal);
	files.forEach(function (file) {
		let currentName = file.replace(".png","");
		let newName = findBestName(currentName, goalNames)
		fs.rename("./Goal/"+file, "./Goal/"+newName+".png", () => {})
	});
});


fs.readdir("./Ship", function (err, files) {
	//handling error
	if (err) {
		return console.log('Unable to scan directory: ' + err);
	} 

	let shipNames = Object.keys(pack.cards.ship);
	files.forEach(function (file) {
		let currentName = file.replace(".png","");
		let newName = findBestName(currentName, shipNames)
		fs.rename("./Ship/"+file, "./Ship/"+newName+".png", () => {})
	});
});

fs.readdir("./Pony", function (err, files) {
	//handling error
	if (err) {
		return console.log('Unable to scan directory: ' + err);
	} 

	let ponyNames = Object.keys(pack.cards.pony);
	files.forEach(function (file) {
		let currentName = file.replace(".png","");
		let newName = findBestName(currentName, ponyNames)
		fs.rename("./Pony/"+file, "./Pony/"+newName+".png", () => {})
	});
});

function findBestName(name, names)
{
	let closestName = "";
	let closestScore = 9999;

	let bestPair = names
		.map(x => [x, damerauLevenshteinDistance(name, x)])
		.reduce((acc, pair) => {

			let [bestName, bestScore] = acc;
			let [thisName, thisScore] = pair;

			if (thisScore < bestScore)
				return pair;
			return acc;
		}, ["", 9999])

	return bestPair[0]
}


function damerauLevenshteinDistance(a, b)
{
	if(a > b)
	{
		let swap = a;
		a = b
		b = swap;
	}

	let cachedValues = [...(a+"1").split("").map(x => [])]

	cachedValues[0][0] = 0;
	let i =0;
	let j = 1;

	while(cachedValues[a.length][b.length] == undefined)
	{
		let routes = [];
		if(i > 0)
			routes.push(cachedValues[i-1][j] + 1)
		if(j > 0)
			routes.push(cachedValues[i][j-1] + 1)
		if(i > 0 && j > 0)
			routes.push(cachedValues[i-1][j-1] + (a[i]==b[j] ? 0 : 1))
		if(i > 1 && j > 1 && a[i-1] == b[j] && b[j-1] == a[i])
			routes.push(cachedValues[i-2][j-2] + (a[i]==b[j] ? 0 : 1))

		cachedValues[i][j] = Math.min(...routes);

		j--;
		i++;

		if(i > a.length || j < 0)
		{
			j = i+j+1;
			i = 0;
		}
	}

	return cachedValues[a.length][b.length]
}