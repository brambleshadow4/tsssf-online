// @ts-ignore
import {toHTML} from "./md.js";
import fs from "fs";




export function buildFAQ(inputFile:string, outputFile:string)
{
	var rawTxt = fs.readFileSync(inputFile, {encoding: "utf8"});

	let topIndex = rawTxt.indexOf("[Top]");
	let faqIndex = rawTxt.indexOf("[FAQ]");

	var topTxt = rawTxt.substring(topIndex + 5, faqIndex);
	var faqTxt = rawTxt.substring(faqIndex + 5);


	var faqLines = faqTxt.split("\n");
	var faqs: {question: string, answer: string, tags: string[]}[] = [];
	var context = "";

	for(let line of faqLines)
	{
		line = line.trim();

		if(line.startsWith("Q: "))
		{
			faqs.push({
				question: "",
				answer: "",
				tags: []
			});
			line = line.substring(3);
			context = "q";
		}
		else if(line.startsWith("A: "))
		{
			line = line.substring(3);
			context = "a";
		}
		else if (line.startsWith("#"))
		{
			context = "tag";
		}

		var faq = faqs[faqs.length -1] || {};

		switch(context)
		{
			case "q":
				if(line != "")
					faq.question += line;
				break;
			case "a":
				if(line != "")
					faq.answer += line;
				break;

			case "tag":

				var pattern = /#\w[A-Za-z.\-]*/g;
				var match: RegExpExecArray | null;
				while ((match = pattern.exec(line)) != null)
				{
					faq.tags.push(match[0].substring(1));
				}
		}
	}


	/*let dups: Set<string> = new Set();
	for(var faq of faqs)
	{	
		if(dups.has(faq.question))
		{
			console.error("duplicate question " + faq.question)
		}

		dups.add(faq.question);
	}*/

	console.log(faqs.length);
}	