import re
import sys
import io
import json

if len(sys.argv) < 2:
	print("Usage: convertPonFile filename")
	exit()


inputFile = sys.argv[1]

f = io.open(inputFile, "r", encoding="utf8")
txt = f.read();

txt = txt.split("\n");
txt.pop(0) # TSSSF is at the beginning of the file


cards = {}

for line in txt:

	
	#item 0 is the card type, Pony | START | Ship | Goal
	#item 1 is the name of the image file (includes .png)
	#item 3 contains various symbols, separated by !
	#item 4 contains the card's full name (not pony name)
	#item 5 contains the keywords
	#item 6 contains the instruction text
	#item 7 contains the quote text
	items = line.split("`")

	

	if len(items) == 7:
		[cardType, imageFile, symbolList, cardName, keywords, instructionText, quoteText] = line.split("`")
	elif len(items) == 8:
		[cardType, imageFile, symbolList, cardName, keywords, instructionText, quoteText, packSymbol] = line.split("`")
	elif len(items) == 9:
		[cardType, imageFile, symbolList, cardName, keywords, instructionText, quoteText, packSymbol, _] = line.split("`")
	
	else:
		print("Problem with line: "  + str(len(items)) + " items")
		for item in items:
			print("  " + str(item))
		continue 

	symbolList = symbolList.split("!")


	keywords = list(map(lambda s : s.strip(), keywords.split(",")))

	card = {}
	cardName = cardName.replace("\\n", " ")
	card["name"] = cardName

	namespaceName = "PU." +  cardType + "." + re.sub("[^\\w]","",cardName)

	card["url"] = imageFile


	if "changelingunicorn" in symbolList:
		card["race"] = "unicorn"
		card["changeling"] = True
	if "changelingearthpony" in symbolList:
		card["race"] = "earth"
		card["changeling"] = True
	if "changelingpegasus" in symbolList:
		card["race"] = "pegasus"
		card["changeling"] = True
	if "changelingalicorn" in symbolList:
		card["race"] = "alicorn"
		card["changeling"] = True

	if "Earth Pony" in symbolList or "earth pony" in symbolList:
		card["race"] = "earth"

	if "Pegasus" in symbolList or "pegasus" in symbolList:
		card["race"] = "pegasus"

	if "Unicorn" in symbolList or "unicorn" in symbolList:
		card["race"] = "unicorn"

	if "Alicorn" in symbolList or "alicorn" in symbolList:
		card["race"] = "alicorn"

	#genders
	if "Male" in symbolList or "male" in symbolList:
		card["gender"] = "male"

	if "Female" in symbolList or "female" in symbolList:
		card["gender"] = "female"

	if "Malefemale" in symbolList or "malefemale" in symbolList:
		card["gender"] = "malefemale"

	if "Dystopian" in symbolList:
		card["altTimeline"] = True

	if cardType == "Ship" or cardType == "Pony":

		if "{replace}" in instructionText:
			card["action"] = "replace"
		if "{swap}" in instructionText:
			card["action"] = "swap"

		if "{3swap}" in instructionText:
			card["action"] = "3swap"

		if "{search}" in instructionText:
			card["action"] = "search"

		if "{draw}" in instructionText:
			card["action"] = "draw"

		if "{copy}" in instructionText:
			card["action"] = "copy"

		if "{goal}" in instructionText:
			card["action"] = "newGoal"

		if "{double pony}" in instructionText:
			card["doublePony"] = "true"

		if "{play from discard}" in instructionText:
			card["action"] = "playFromDiscard"

		if "{race change}" in instructionText:
			card["action"] = "raceChange"

		if "{timeline change}" in instructionText:
			card["action"] = "timelineChange"

		if "{love poison}" in instructionText:
			card["action"] = "lovePoison"

		if "{gender change}" in instructionText:
			card["action"] = "genderChange"

		if "{clone}" in instructionText:
			card["action"] = "clone"

		if "{keyword change}" in instructionText:
			card["action"] = "keywordChange"


	if cardType == "Goal":
		card["points"] = symbolList[1]


	if cardType == "Pony":
		if len(keywords) == 1 and keywords[0] == "":
			keywords = []

		card["keywords"] = keywords

	cards[namespaceName] = card


output = json.dumps(cards, indent=4)

output = re.sub('"(\\w+)":', "\\1:", output)
output = re.sub('    ', "\t", output)


f = io.open(inputFile.replace(".pon",".json"), "w", encoding='utf8')

f.write(output)